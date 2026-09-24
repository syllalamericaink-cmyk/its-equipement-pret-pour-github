const PDFDocument = require('pdfkit');
const fs = require('fs');
const args = process.argv[2];
const buf = Buffer.concat([new Uint8Array(new Uint8Array(Buffer.from(args))))]);
fs.writeFileSync('/tmp/its-devis-' + Date.now() + '.pdf', buf);
console.log('OK', buf.length);', buf.slice(0,5).toString());
