const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && (filepath.endsWith('.ts') || filepath.endsWith('.tsx'))) {
      callback(filepath);
    }
  });
}

walk('./src', filepath => {
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('/login') || content.includes('redirect')) {
    console.log(`File: ${filepath}`);
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('/login') || line.includes('redirect')) {
        console.log(`  Line ${i+1}: ${line.trim()}`);
      }
    });
  }
});
