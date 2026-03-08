// Post-build script to fix Electron module resolution
// Run after electron-vite build: node scripts/fix-electron.js

const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('[fix-electron] File not found:', filePath);
    return;
  }
  
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Check for the electron require pattern
  const requirePattern = "require(\"electron\")";
  const altPattern = "require('electron')";
  
  const hasReq = code.includes(requirePattern) || code.includes(altPattern);
  console.log('[fix-electron] Checking', filePath, '- has electron require:', hasReq);
  
  if (!hasReq) return;
  
  // Collect all electron.X property accesses
  const propRegex = /electron\.([\w]+)/g;
  const props = new Set();
  let match;
  while ((match = propRegex.exec(code)) !== null) {
    // Skip 'electron.exe', 'electron.app.getPath' patterns inside strings
    if (match[1] !== 'exe' && match[1] !== 'js2c') {
      props.add(match[1]);
    }
  }
  
  console.log('[fix-electron] Found properties:', Array.from(props).join(', '));
  
  if (props.size === 0) {
    console.log('[fix-electron] No electron properties to fix');
    return;
  }
  
  const allProps = Array.from(props);
  
  // Replace the const electron = require("electron"); line
  // with destructured import
  const oldReq1 = 'const electron = require("electron");';
  const oldReq2 = "const electron = require('electron');";
  const newReq = 'const { ' + allProps.join(', ') + ' } = require("electron");';
  
  if (code.includes(oldReq1)) {
    code = code.replace(oldReq1, newReq);
  } else if (code.includes(oldReq2)) {
    code = code.replace(oldReq2, newReq);
  }
  
  // Replace all electron.prop with just prop
  for (const prop of allProps) {
    // Split and join is safer than regex for this  
    code = code.split('electron.' + prop).join(prop);
  }
  
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('[fix-electron] Patched', filePath, '(' + allProps.length + ' properties)');
}

// Patch main and preload bundles
const outDir = path.join(__dirname, '..', 'out');
patchFile(path.join(outDir, 'main', 'index.js'));
patchFile(path.join(outDir, 'preload', 'index.js'));

console.log('[fix-electron] Done!');
