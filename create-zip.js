const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('volunteerflow.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('\n✅ Created volunteerflow.zip');
});

archive.pipe(output);
archive.directory('volunteerflow/', 'volunteerflow');
archive.finalize();