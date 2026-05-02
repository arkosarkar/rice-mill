/**
 * Removes the orphaned `});` lines that were left behind after stripping sql.begin() wrappers.
 * Also fixes indentation of the remaining code inside what used to be the transaction block.
 */
const fs = require('fs');

const files = [
  '../src/controllers/paddyController.js',
  '../src/controllers/cleaningController.js',
  '../src/controllers/productionController.js',
];

files.forEach(filePath => {
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const filtered = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Remove the stray closing }); that were the end of sql.begin blocks
    // These end up right before either a comment or await updateStock or await syncFarmer
    // We detect them by checking if a line is exactly `    });` or `    })` and the next line isn't the end of something meaningful
    if (trimmed === '});' && filtered.length > 0) {
      // Look back: if the previous non-empty line is an updateStock call or sql` call, this }); is orphaned
      let prevIdx = filtered.length - 1;
      while (prevIdx >= 0 && filtered[prevIdx].trim() === '') prevIdx--;
      const prevLine = filtered[prevIdx] ? filtered[prevIdx].trim() : '';
      if (prevLine.endsWith('ADD\');') || prevLine.endsWith('REMOVE\');') || prevLine.endsWith("'Main Godown')") || prevLine.endsWith('REMOVE\');')) {
        console.log(`  Removed orphaned }); at line ${i + 1} in ${filePath}`);
        continue; // skip this line
      }
    }
    filtered.push(lines[i]);
  }
  
  fs.writeFileSync(filePath, filtered.join('\n'));
  console.log('Cleaned:', filePath);
});
