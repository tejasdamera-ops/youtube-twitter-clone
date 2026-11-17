import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
function walk(dir) { return readdirSync(dir, { withFileTypes:true }).flatMap(f => f.isDirectory() ? walk(join(dir,f.name)) : f.name.endsWith('.js') ? [join(dir,f.name)] : []); }
for (const file of [...walk('src'), ...walk('public'), ...walk('tests')]) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio:'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
await import('../src/app.js');
console.log('All JavaScript syntax and server imports passed.');
