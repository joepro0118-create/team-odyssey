import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const localPython = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
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
function launch(command, args, stdio = 'inherit') {
  const child = spawn(command, args, { cwd: root, stdio, windowsHide: true });
  children.push(child);
  child.on('error', (error) => {
    console.error(`Could not start ${command}: ${error.message}. See backend/README.md for setup.`);
    stop(1);
  });
  child.on('exit', (code) => { if (!stopping) stop(code || 1); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
// Start Vite only after both owned services have bound their ports.
const api = launch(python, ['-u', 'backend/server.py'], ['ignore', 'pipe', 'inherit']);
const chat = launch(python, ['-u', 'backend/chat_api.py'], ['ignore', 'inherit', 'pipe']);
const ready = new Set();
const startupTimer = setTimeout(() => {
  console.error('API startup timed out. Check Python dependencies and ports 8000/8001.');
  stop(1);
}, 20000);
startupTimer.unref();
function watchReady(stream, output, name, marker) {
  let buffer = '';
  stream.on('data', chunk => {
    output.write(chunk);
    buffer = (buffer + chunk.toString()).slice(-4000);
    if (stopping || ready.has(name) || !buffer.includes(marker)) return;
    ready.add(name);
    if (ready.size === 2) {
      clearTimeout(startupTimer);
      launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort']);
    }
  });
}
watchReady(api.stdout, process.stdout, 'calendar', 'Calendar API ready');
watchReady(chat.stderr, process.stderr, 'chat', 'Uvicorn running on');
