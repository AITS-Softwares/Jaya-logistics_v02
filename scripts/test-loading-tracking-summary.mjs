import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('next/dist/compiled/babel/core');
const source = fs.readFileSync(new URL('../src/components/LoadingTrackingSummary.jsx', import.meta.url), 'utf8');
const { code } = babel.transformSync(source, {
  babelrc: false,
  configFile: false,
  presets: [[require('next/dist/compiled/babel/preset-react'), { runtime: 'classic' }]],
  plugins: [require('next/dist/compiled/babel/plugin-transform-modules-commonjs')],
});
const module = { exports: {} };
let cachedResult;
let stateIndex = 0;
const componentRequire = (name) => {
  if (name === 'react') return {
    ...React,
    useState: (initial) => React.useState(stateIndex++ === 0 ? cachedResult ?? initial : initial),
  };
  if (name === 'next/link') return ({ children }) => React.createElement('a', null, children);
  if (name.includes('usePermission')) return { usePermission: () => ({ canView: () => true, canEdit: () => true, loading: false }) };
  return require(name);
};
new Function('require', 'module', 'exports', 'React', code)(componentRequire, module, module.exports, React);
const Summary = module.exports.default;
const render = (loadingId, result = null) => {
  cachedResult = result;
  stateIndex = 0;
  return renderToStaticMarkup(React.createElement(Summary, { loadingId }));
};

for (const loadingId of [undefined, null, '']) {
  const html = render(loadingId);
  assert.match(html, /Not linked/);
  assert.match(html, /Save Loading Info to link tracking/);
}
const html = render('loading-1');
assert.match(html, /Loading…/);
assert.match(html, /Open Tracking Panel/);
const cached = { loadingId: 'loading-1', data: { trips: [{ vehicleNo: 'TEST-VEHICLE', tripState: 'active' }] } };
assert.match(render('loading-1', cached), /TEST-VEHICLE/);
assert.doesNotMatch(render('loading-2', cached), /TEST-VEHICLE/);
assert.doesNotMatch(render(undefined, cached), /TEST-VEHICLE/);
console.log('PASS: tracking summary handles missing IDs, initial loading, matching data, and stale data after switching records.');
