import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Keep both services under one PM2 process. If either stops unexpectedly,
// stop its sibling and exit nonzero so PM2 restarts the complete pair.
export function superviseProduction({ spawnChild = spawn, host = process, log = console, timeoutMs = 8000 } = {}) {
  const children = new Set();
  let stopping = false;
  let exitCode = 0;
  let timer;
  function finish() {
    clearTimeout(timer);
    host.removeListener('SIGINT', onInterrupt);
    host.removeListener('SIGTERM', onTerminate);
    host.removeListener('message', onMessage);
    host.exit(exitCode);
  }
  function stop(code, signal = 'SIGTERM') {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    for (const child of children) {
      try { child.kill(signal); } catch { /* Escalate if a child cannot stop gracefully. */ }
    }
    if (!children.size) return finish();
    timer = setTimeout(() => {
      for (const child of children) {
        try { child.kill('SIGKILL'); } catch { /* Already exited. */ }
      }
      finish();
    }, timeoutMs);
  }
  const onInterrupt = () => stop(0, 'SIGINT');
  const onTerminate = () => stop(0);
  const onMessage = message => { if (message === 'shutdown') stop(0); };
  host.on('SIGINT', onInterrupt);
  host.on('SIGTERM', onTerminate);
  host.on('message', onMessage);

  for (const [name, args] of [
    ['web', [require.resolve('next/dist/bin/next'), 'start', ...host.argv.slice(2)]],
    ['push', [path.join(root, 'scripts/push-worker.mjs')]],
  ]) {
    if (stopping) break;
    try {
      const child = spawnChild(host.execPath, args, {
        cwd: root, env: { ...host.env, NODE_ENV: 'production' }, stdio: 'inherit', windowsHide: true,
      });
      children.add(child);
      log.log(`[production] ${name} process started.`);
      child.on('error', () => {
        log.error(`[production] Unable to start ${name}; restarting both services is required.`);
        stop(1);
      });
      child.on('close', (code, signal) => {
        children.delete(child);
        if (!stopping) {
          log.error(`[production] ${name} stopped (${signal || code}); shutting down both services.`);
          stop(1);
        } else if (!children.size) finish();
      });
    } catch {
      log.error(`[production] Unable to launch ${name}.`);
      stop(1);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) superviseProduction();
