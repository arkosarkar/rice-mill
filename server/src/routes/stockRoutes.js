const express = require('express');
const router = express.Router();
const sql = require('../config/db');

// ── Main stock list (reads from central aggregate rice_stocks table) ─────────
router.get('/', async (req, res) => {
  try {
    const stocks = await sql`
      SELECT
        id,
        CASE 
          WHEN item_type = 'paddy' THEN 'Paddy'
          WHEN item_type = 'finished_rice' THEN 'Rice'
          WHEN item_type = 'by_product' THEN
            CASE 
              WHEN rice_type ILIKE '%bran%' THEN 'Bran'
              WHEN rice_type ILIKE '%husk%' THEN 'Husk'
              WHEN rice_type ILIKE '%broken%' THEN 'Broken'
              ELSE 'By-Product'
            END
          ELSE item_type
        END AS type,
        variety,
        rice_type AS "riceType",
        godown,
        GREATEST(0, bags) AS bags,
        GREATEST(0, available_weight_kg) AS "availableWeightKg",
        last_updated AS "updatedAt"
      FROM rice_stocks
      WHERE available_weight_kg > 0
      ORDER BY last_updated DESC
    `;
    res.json(stocks);
  } catch (error) {
    console.error('SQL Error in Stock Route:', error);
    res.status(500).json({ message: 'Failed to load stock', error: error.message });
  }
});

// ── Godown list (utility for tabs/dropdowns) ──────────────────────────────────
router.get('/godowns', async (req, res) => {
  try {
    const godowns = await sql`
      SELECT name, capacity_kg as "capacityKg", type
      FROM godowns
      ORDER BY name ASC
    `;
    res.json(godowns);
  } catch (error) {
    console.error('SQL Error in Godowns Route:', error);
    res.status(500).json({ message: 'Failed to load godowns list' });
  }
});

// ── Add New Godown ───────────────────────────────────────────────────────────
router.post('/godowns', async (req, res) => {
  try {
    const { name, capacityKg } = req.body;
    
    if (!name) return res.status(400).json({ message: 'Godown name is required' });

    const result = await sql`
      INSERT INTO godowns (name, capacity_kg)
      VALUES (${name}, ${capacityKg || 100000})
      RETURNING *
    `;

    res.json({ message: 'Godown added successfully', godown: result[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'A godown with this name already exists' });
    }
    console.error('SQL Error in Add Godown:', error);
    res.status(500).json({ message: 'Failed to add godown' });
  }
});


// ── Godown utilisation summary ─────────────────────────────────────────────────
router.get('/godown-summary', async (req, res) => {
  try {
    const GODOWN_CAPACITY_T = 100; // assumed capacity per godown in Tonnes

    const rows = await sql`
      SELECT godown, GREATEST(0, available_weight_kg) AS available_kg
      FROM rice_stocks
      WHERE available_weight_kg > 0
    `;

    const godownMap = {};
    rows.forEach(r => {
      const g = r.godown || 'Unassigned';
      if (!godownMap[g]) godownMap[g] = 0;
      godownMap[g] += Number(r.available_kg);
    });

    const summary = Object.entries(godownMap).map(([godown, totalKg]) => ({
      godown,
      totalKg:        Math.round(totalKg * 100) / 100,
      totalTonnes:    Math.round((totalKg / 1000) * 100) / 100,
      capacityTonnes: GODOWN_CAPACITY_T,
      utilizationPct: Math.min(100, Math.round((totalKg / 1000 / GODOWN_CAPACITY_T) * 10000) / 100),
    }));

    res.json(summary);
  } catch (error) {
    console.error('SQL Error in Godown Summary:', error);
    res.status(500).json({ message: 'Failed to load godown summary', error: error.message });
  }
});


// ── Per-Godown Stock Summary (Mill Pro Buckets) ─────────────────────────
// Updated: Uses LEFT JOIN with godowns table to show empty godowns too
router.get('/summary', async (req, res) => {
  try {
    const summary = await sql`
      SELECT 
        g.name,
        g.capacity_kg as capacity,
        COALESCE(SUM(CASE WHEN s.item_type = 'paddy' THEN s.available_weight_kg ELSE 0 END), 0) as paddy_kg,
        COALESCE(SUM(CASE WHEN s.item_type = 'finished_rice' THEN s.available_weight_kg ELSE 0 END), 0) as rice_kg,
        COALESCE(SUM(CASE WHEN s.item_type = 'by_product' AND (s.rice_type ILIKE '%bran%') THEN s.available_weight_kg ELSE 0 END), 0) as bran_kg,
        COALESCE(SUM(CASE WHEN s.item_type = 'by_product' AND (s.rice_type ILIKE '%husk%') THEN s.available_weight_kg ELSE 0 END), 0) as husk_kg,
        COALESCE(SUM(CASE WHEN s.item_type = 'by_product' AND (s.rice_type ILIKE '%broken%' OR s.rice_type ILIKE '%reject%') THEN s.available_weight_kg ELSE 0 END), 0) as broken_kg,
        COALESCE(SUM(CASE WHEN s.item_type = 'by_product' 
                 AND NOT (s.rice_type ILIKE '%bran%' OR s.rice_type ILIKE '%husk%' OR s.rice_type ILIKE '%broken%' OR s.rice_type ILIKE '%reject%')
            THEN s.available_weight_kg ELSE 0 END), 0) as other_kg,
        COALESCE(SUM(s.available_weight_kg), 0) as total_kg
      FROM godowns g
      LEFT JOIN rice_stocks s ON g.name = s.godown
      GROUP BY g.name, g.capacity_kg
      ORDER BY g.name ASC
    `;
    res.json(summary);
  } catch (error) {
    console.error('SQL Error in Stock Summary:', error);
    res.status(500).json({ message: 'Failed to load stock summary' });
  }
});

// ── Unified Stock Movement Logs (Centralized stock_movements) ────────────────
router.get('/logs', async (req, res) => {
  try {
    const logs = await sql`
      SELECT
        id,
        created_at AS date,
        action_type,
        variety,
        rice_type,
        ROUND((weight_kg / 1000.0), 1) AS weight_tonne,
        COALESCE(from_godown, 'X') || ' ➔ ' || COALESCE(to_godown, 'X') AS path,
        description
      FROM stock_movements
      ORDER BY created_at DESC
      LIMIT 20
    `;
    res.json(logs);
  } catch (error) {
    console.error('SQL Error in Stock Logs:', error);
    res.status(500).json({ message: 'Failed to load stock logs' });
  }
});


module.exports = router;
