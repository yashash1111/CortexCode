const fs = require('fs');

const data = JSON.parse(fs.readFileSync('apps/web/eslint-results2.json', 'utf8'));
let count = 0;
data.forEach(file => {
  const matchingMessages = file.messages.filter(m => ['@typescript-eslint/no-explicit-any', 'react-hooks/set-state-in-effect'].includes(m.ruleId));
  if (matchingMessages.length > 0) {
    console.log(file.filePath);
    matchingMessages.forEach(m => console.log('  ', m.ruleId, m.line));
  }
  count += matchingMessages.length;
});
console.log('Total remaining issues:', count);
