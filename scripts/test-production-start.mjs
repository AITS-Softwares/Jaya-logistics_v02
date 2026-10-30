import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { superviseProduction } from './start-production.mjs';

function fixture() {
  const host = new EventEmitter();
  Object.assign(host, { argv: ['node', 'launcher', '-p', '3010'], execPath: process.execPath, env: { PORT: '3010' }, exit: code => exits.push(code) });
  const exits = [], children = [], calls = [];
  superviseProduction({ host, log: { log() {}, error() {} }, spawnChild(command, args, options) {
    const child = new EventEmitter(); child.signals = [];
    child.kill = signal => { child.signals.push(signal); return true; };
    children.push(child); calls.push({ command, args, options }); return child;
  } });
  return { host, exits, children, calls };
}
let run = fixture();
assert.equal(run.children.length, 2);
assert.ok(run.calls[0].args.includes('start'));
assert.deepEqual(run.calls[0].args.slice(-2), ['-p', '3010']);
assert.ok(run.calls[1].args[0].endsWith('push-worker.mjs'));
assert.equal(run.calls[1].options.env.NODE_ENV, 'production');
assert.equal(run.calls[1].options.env.PORT, '3010');
run.children[1].emit('close', 1, null);
assert.deepEqual(run.children[0].signals, ['SIGTERM']);
run.children[0].emit('close', 0, null);
assert.deepEqual(run.exits, [1]);
run = fixture();
run.host.emit('SIGINT');
assert.ok(run.children.every(child => child.signals[0] === 'SIGINT'));
run.children.forEach(child => child.emit('close', 0, null));
assert.deepEqual(run.exits, [0]);
run = fixture();
run.children[0].emit('error', new Error('spawn failed'));
assert.ok(run.children.every(child => child.signals[0] === 'SIGTERM'));
run.children.forEach(child => child.emit('close', 1, null));
assert.deepEqual(run.exits, [1]);
run = fixture();
run.children[0].emit('close', 0, null);
run.children[1].emit('close', 0, null);
assert.deepEqual(run.exits, [1], 'An unexpected clean exit must still trigger PM2 restart.');
console.log('PASS: web/worker startup, shared configuration, port arguments, signal shutdown and failure propagation. No server or database was started.');
