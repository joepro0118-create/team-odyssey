import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaultPython = process.platform === 'win32' ? 'py' : 'python';
const python = process.env.EQUILIBRIUM_PYTHON || (existsSync(localPython) ? localPython : defaultPython);
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
function launch(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Could not start ${command}: ${error.message}. See backend/README.md for setup.`);
    stop(1);
  });
  child.on('exit', (code) => { if (!stopping) stop(code || 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
// Wait for this API's readiness, so a port conflict cannot attach another API.
const api = spawn(python, ['-u', 'backend/server.py'], {
  cwd: root, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
});
children.push(api);
let started = false;
api.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (!started && chunk.toString().includes('Calendar API ready')) {
    started = true;
    launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  }
});
api.on('error', (error) => {
  console.error(`Python could not start: ${error.message}. Create .venv and install backend/requirements.txt first.`);
  stop(1);
});
api.on('exit', (code) => { if (!stopping) stop(code || 1); });
