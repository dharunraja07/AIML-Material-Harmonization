const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');

// 1. Determine Python executable (prefer local virtual environment if present)
const isWin = process.platform === 'win32';
const venvPython = isWin
  ? path.join(rootDir, '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, '.venv', 'bin', 'python');

const pythonExe = fs.existsSync(venvPython) ? venvPython : (isWin ? 'python' : 'python3');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '   SIH26099 Material Harmonization Dev Server');
console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log(`[Backend] Python executable: ${pythonExe}`);
console.log(`[Backend] API starting at:   http://127.0.0.1:8000`);
console.log(`[Frontend] UI starting at:   http://localhost:3000\n`);

// 2. Spawn FastAPI backend
const backend = spawn(pythonExe, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// 3. Spawn Next.js frontend
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
});

// Handle termination & clean up child processes
function cleanup() {
  console.log('\nStopping servers...');
  if (backend && !backend.killed) {
    try {
      if (isWin && backend.pid) {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']);
      } else {
        backend.kill('SIGINT');
      }
    } catch (_) {}
  }
  if (frontend && !frontend.killed) {
    try {
      if (isWin && frontend.pid) {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
      } else {
        frontend.kill('SIGINT');
      }
    } catch (_) {}
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
