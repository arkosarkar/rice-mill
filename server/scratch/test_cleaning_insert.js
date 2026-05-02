const sql = require('../src/config/db');

async function testInsert() {
  try {
    const body = {
      processDate: '2026-04-17',
      shift: 'Day',
      inwardRef: 'TEST-123',
      paddyVariety: 'IR64',
      sourceGodown: 'Godown A',
      rawPaddyInputKg: 100,
      inputBags: 2,
      preCleaningMoisturePercent: 12,
      stonesKg: 1,
      dustKg: 1,
      strawKg: 1,
      otherWasteKg: 1,
      cleanPaddyOutputKg: 90,
      outputBags: 2,
      postCleaningMoisturePercent: 11,
      destinationGodown: 'Godown B',
      destinationStack: 'Stack 1',
      readyForMilling: 'Yes - Send to Production',
      impurityAfter: 0.1,
      labourCount: 2,
      labourCost: 500,
      powerConsumption: 10,
      remarks: 'Test'
    };

    const inputWeightKg = body.rawPaddyInputKg;
    const cleanOutputKg = body.cleanPaddyOutputKg;
    const stonesKg = body.stonesKg;
    const dustKg = body.dustKg;
    const strawKg = body.strawKg;
    const otherWasteKg = body.otherWasteKg;
    const totalWasteKg = 4;
    const wastePercent = 4;
    const efficiencyPercent = 90;

    console.log('Attempting manual insert...');
    const result = await sql`
      INSERT INTO cleaning_batches (
        process_date, shift, inward_ref, paddy_variety, source_godown,
        input_weight_kg, input_bags, pre_cleaning_moisture_percent,
        stones_kg, dust_kg, straw_kg, other_waste_kg, total_waste_kg, waste_percent,
        clean_output_kg, output_bags, post_cleaning_moisture_percent,
        destination_godown, destination_stack, efficiency_percent,
        ready_for_milling, impurity_after_percent, labour_count,
        labour_cost, power_consumption, remarks
      ) VALUES (
        ${body.processDate}, ${body.shift}, ${body.inwardRef}, ${body.paddyVariety}, ${body.sourceGodown},
        ${inputWeightKg}, ${body.inputBags}, ${body.preCleaningMoisturePercent},
        ${stonesKg}, ${dustKg}, ${strawKg}, ${otherWasteKg}, ${totalWasteKg}, ${wastePercent},
        ${cleanOutputKg}, ${body.outputBags}, ${body.postCleaningMoisturePercent},
        ${body.destinationGodown}, ${body.destinationStack}, ${efficiencyPercent},
        ${body.readyForMilling}, ${body.impurityAfter}, ${body.labourCount},
        ${body.labourCost}, ${body.powerConsumption}, ${body.remarks}
      ) RETURNING *
    `;
    console.log('Insert Success:', result[0]);
    process.exit(0);
  } catch (e) {
    console.error('Insert Failed:', e.message);
    process.exit(1);
  }
}

testInsert();
