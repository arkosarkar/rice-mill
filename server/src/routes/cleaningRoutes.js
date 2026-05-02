const express = require('express');
const router = express.Router();
const cleaningController = require('../controllers/cleaningController');

const sql = require('../config/db');

router.get('/ready-for-milling', async (req, res) => {
    try {
        const batches = await sql`
      SELECT 
        cb.*,
        (cb.clean_output_kg - COALESCE((
          SELECT SUM(paddy_input_kg) 
          FROM productions 
          WHERE TRIM(cleaning_batch_ref) = TRIM(cb.id::text) 
             OR (cb.inward_ref IS NOT NULL AND TRIM(cleaning_batch_ref) = TRIM(cb.inward_ref))
        ), 0)) as available_kg
      FROM cleaning_batches cb
      WHERE cb.ready_for_milling = 'Yes - Send to Production'
      AND (cb.clean_output_kg - COALESCE((
          SELECT SUM(paddy_input_kg) 
          FROM productions 
          WHERE TRIM(cleaning_batch_ref) = TRIM(cb.id::text) 
             OR (cb.inward_ref IS NOT NULL AND TRIM(cleaning_batch_ref) = TRIM(cb.inward_ref))
        ), 0)) > 0
      ORDER BY cb.created_at DESC
    `;
        res.json(batches);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch ready batches', error: error.message });
    }
});

router.get('/available-batches', async (req, res) => {
    try {
      const rawBatches = await sql`
        SELECT 
          inward_no AS ref, 
          supplier_name, 
          paddy_variety, 
          godown AS source_godown, 
          (net_weight_kg - COALESCE((
            SELECT SUM(input_weight_kg) 
            FROM cleaning_batches 
            WHERE TRIM(inward_ref) = TRIM(paddy_inwards.inward_no)
          ), 0)) AS available_weight_kg
        FROM paddy_inwards 
        WHERE (net_weight_kg - COALESCE((
            SELECT SUM(input_weight_kg) 
            FROM cleaning_batches 
            WHERE TRIM(inward_ref) = TRIM(paddy_inwards.inward_no)
          ), 0)) > 0
      `;
  
      const recleanBatches = await sql`
        SELECT 
          source_ref AS ref, 
          'Re-clean Batch' AS supplier_name, 
          variety AS paddy_variety, 
          godown AS source_godown, 
          available_weight_kg 
        FROM rice_stocks 
        WHERE item_type = 'paddy' 
          AND is_recleaning = true 
          AND available_weight_kg > 0
      `;
  
      res.json({
        rawBatches,
        recleanBatches
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch available batches', error: error.message });
    }
});

router.post('/', cleaningController.createCleaning);
router.get('/', cleaningController.listCleaning);
router.put('/:id', cleaningController.updateCleaning);
router.delete('/:id', cleaningController.deleteCleaning);

module.exports = router;
