const fs = require('fs');

const content = fs.readFileSync('/home/z/my-project/src/app/(public)/devis-confirmation/page.tsx', 'utf8');

const before = content.slice(0, content.indexOf('try {'));
const after = content.slice(content.indexOf('} catch') + 1);
console.log('try block: lines', before, 'to');

const block = before + '\n' + after;

const newContent = before.join('\n') + block;
fs.writeFileSync('/home/z/my-project/src/app/(public)/devis-confirmation/page.tsx', newContent, 'utf8');
console.log('Written successfully');
