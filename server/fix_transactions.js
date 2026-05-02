/**
 * This script removes sql.begin() transaction wrappers from all backend controllers
 * since the Neon HTTP driver doesn't support transactions.
 * It replaces:
 *   await sql.begin(async (tx) => { ... });
 * with just the inner body, replacing 'tx`' with 'sql`'
 */
const fs = require('fs');

const files = [
  'server/src/controllers/paddyController.js',
  'server/src/controllers/cleaningController.js',
  'server/src/controllers/productionController.js',
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace `await sql.begin(async (tx) => {` with an empty comment
  content = content.replace(/\s*await sql\.begin\(async \(tx\) => \{/g, '\n    // Stock operations (sequential - Neon HTTP doesn\'t support transactions)');
  
  // Replace `});` that closes the begin block — tricky, use heuristic: find standalone `    });` patterns
  // We handle this by replacing `tx\`` with `sql\``
  content = content.replace(/\btx`/g, 'sql`');
  
  // Also replace `(tx)` in updateStock calls
  content = content.replace(/updateStock\(tx,/g, 'updateStock(sql,');

  fs.writeFileSync(filePath, content);
  console.log('Processed:', filePath);
});

console.log('Done! Now manually check the closing });  of each begin block.');
