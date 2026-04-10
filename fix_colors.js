const fs = require('fs');
const path = require('path');

const colorMapping = {
  ''#e67e22'': "'#e67e22'",
  ''#0284c7'': "'#0284c7'",
  ''#94a3b8'': "'#94a3b8'",
  ''#ffffff'': "'#ffffff'",
  ''#030712'': "'#030712'",
  ''#e2e8f0'': "'#e2e8f0'",
  ''rgba(255,255,255,0.03)'': "'rgba(255,255,255,0.03)'",
  ''rgba(255,255,255,0.05)'': "'rgba(255,255,255,0.05)'",
  ''rgba(255,255,255,0.02)'': "'rgba(255,255,255,0.02)'",
  ''rgba(255,255,255,0.05)'': "'rgba(255,255,255,0.05)'",
  ''rgba(255,255,255,0.03)'': "'rgba(255,255,255,0.03)'",
  ''rgba(255,255,255,0.03)'Border': "'rgba(255,255,255,0.05)'",
  ''#10b981'': "'#10b981'",
  ''#ef4444'': "'#ef4444'",
  ''#f59e0b'': "'#f59e0b'"
};

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

  Object.keys(colorMapping).forEach(key => {
    // We use a regex to ensure we only match full "Colors.prop" and not sub-properties
    // but the simple includes/split/join is usually fine for this codebase
    if (content.includes(key)) {
      content = content.split(key).join(colorMapping[key]);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`FIXED: ${file}`);
  }
});
