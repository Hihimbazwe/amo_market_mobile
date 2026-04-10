const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.git', '.expo'].includes(file)) {
        results = results.concat(walk(filePath));
      }
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk('.');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Regex to match the import { Colors } from '...' line
  // Matches:  or import { Colors, ... } from '...'
  // Note: We only remove if it's the specific '../theme/colors' or similar
  const importRegex = /import\s+{[^}]*\bColors\b[^}]*}\s+from\s+['\"][^'\"]*colors['\"];?\n?/g;
  
  if (importRegex.test(content)) {
    content = content.replace(importRegex, (match) => {
      // If there are other things in the braces, we should keep the import but remove Colors
      // e.g. import { OTHER } from './colors' -> import { OTHER } from './colors'
      const inner = match.match(/{([^}]*)}/)[1];
      const items = inner.split(',').map(s => s.trim()).filter(s => s !== 'Colors');
      
      if (items.length === 0) {
        changed = true;
        return '';
      } else {
        changed = true;
        return match.replace(/{[^}]*}/, `{ ${items.join(', ')} }`);
      }
    });
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`CLEANED IMPORTS: ${file}`);
  }
});
