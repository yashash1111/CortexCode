const fs = require('fs');

const data = JSON.parse(fs.readFileSync('eslint-to-fix.json', 'utf8'));

for (const [file, issues] of Object.entries(data)) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  
  // Sort issues by line descending to not mess up line numbers if we were adding/removing, but here we just replace inline
  for (const issue of issues) {
    if (issue.ruleId === '@typescript-eslint/no-explicit-any') {
      const lineIdx = issue.line - 1;
      // Replace the exact 'any' at column
      const colIdx = issue.column - 1;
      
      // Look for 'any' around that column
      const before = lines[lineIdx].substring(0, colIdx);
      const after = lines[lineIdx].substring(colIdx);
      
      if (after.startsWith('any')) {
        lines[lineIdx] = before + 'unknown' + after.substring(3);
      } else {
        // Find the first 'any' on or after that column
        const match = after.match(/\bany\b/);
        if (match) {
           const matchIdx = after.indexOf('any');
           lines[lineIdx] = before + after.substring(0, matchIdx) + 'unknown' + after.substring(matchIdx + 3);
        } else {
           // Fallback just replace 'any'
           lines[lineIdx] = lines[lineIdx].replace(/\bany\b/, 'unknown');
        }
      }
    }
  }
  
  fs.writeFileSync(file, lines.join('\n'));
}
