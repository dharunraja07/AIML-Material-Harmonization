const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'web');
const isWin = process.platform === 'win32';

// Clean up any stale processes that may be holding port 3000 or 8000
function killPort(port) {
  if (isWin) {
    try {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }
}

killPort(3000);
killPort(8000);

// Determine Python executable (prefer local virtual environment if present)
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

// 1. Spawn FastAPI backend (shell: false prevents cmd.exe space-in-path issues on Windows)
const backend = spawn(pythonExe, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

backend.on('error', (err) => {
  console.error('[Backend Error]:', err);
});

// 2. Spawn Next.js frontend
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: true,
});

frontend.on('error', (err) => {
  console.error('[Frontend Error]:', err);
});

// Handle termination & clean up child processes
function cleanup() {
  console.log('\nStopping servers...');
  if (backend && !backend.killed) {
    try {
      if (isWin && backend.pid) {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { shell: false });
      } else {
        backend.kill('SIGINT');
      }
    } catch (_) {}
  }
  if (frontend && !frontend.killed) {
    try {
      if (isWin && frontend.pid) {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t'], { shell: false });
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
