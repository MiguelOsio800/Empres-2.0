import fs from 'fs';
import { execSync } from 'child_process';

const filesCmd = execSync('grep -rl "toISOString" components/ contexts/').toString().trim();
const files = filesCmd ? filesCmd.split('\n') : [];

for (const file of files) {
  if (!file) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace new Date().toISOString().split('T')[0]
  content = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]");

  // Replace new Date().toISOString().slice(0, 10)
  content = content.replace(/new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/g, "new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]");

  // Replace new Date().toISOString()
  // careful not to replace the ones we just replaced
  // wait! the above replacements ALREADY replaced the ones that had .split('T')[0] and .slice() IF we ran them first.
  // Actually, those replacements changed "new Date().toISOString()" into "new Date(Date.now() - ...).toISOString()" ONLY when part of the chunk.
  // Then we can replace any remaining "new Date().toISOString()" that wasn't touched.
  content = content.replace(/new Date\(\)\.toISOString\(\)/g, "new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString()");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
