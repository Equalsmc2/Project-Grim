// Source inspected: local Soul Seekers v40.10 / quick combat 40.15.
// Set QA_SITE_DIR to your WEBSITE directory. Local mode avoids Firebase writes.
export default {
  name: 'soul-seekers', baseURL: 'http://127.0.0.1:4173', command: 'node scripts/serve.mjs',
  testMatch: ['**/smoke.spec.mjs', '**/soul-seekers.spec.mjs'],
  routes: [{ name: 'terminal', path: '/?local=1', ready: '#mainDashboard' }],
  visual: 'capture', masks: ['#weatherCanvas', '.world-banner'],
  allowedConsoleErrors: [], allowedNetworkErrors: [], blockExternal: true
};
