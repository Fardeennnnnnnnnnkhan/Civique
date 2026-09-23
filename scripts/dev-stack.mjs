import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import dotenv from 'dotenv';

if (!existsSync('.env')) {
  console.error('Missing .env. Copy .env.example to .env and configure local-only values.');
  process.exit(1);
}

dotenv.config({ path: '.env' });

const children = [];
let stopping = false;

if (process.env.SKIP_DOCKER !== 'true') {
  const compose = spawnSync('docker', ['compose', 'up', '-d', 'postgres'], { stdio: 'inherit' });
  if (compose.status !== 0) {
    console.error('PostgreSQL startup failed. Start it manually or set SKIP_DOCKER=true when a database is already available.');
    process.exit(compose.status || 1);
  }
}

start('api', 'npm', ['run', 'dev:api']);
start('web', 'npm', ['run', 'dev:web']);
start('worker', 'npm', ['run', 'dev:worker']);
start('ml', process.env.PYTHON_BIN || 'python3', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'], 'services/ml');

function start(name, command, args, cwd = process.cwd()) {
  const child = spawn(command, args, { cwd, env: process.env, stdio: 'inherit' });
  children.push({ name, child });
  child.once('error', (error) => {
    console.error(`${name} failed to start: ${error.message}`);
    void shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${name} exited unexpectedly (${signal || code || 0}).`);
    void shutdown(code || 1);
  });
}

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const { child } of children) if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  await Promise.all(children.map(({ child }) => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 5_000).unref();
  })));
  process.exit(exitCode);
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));
