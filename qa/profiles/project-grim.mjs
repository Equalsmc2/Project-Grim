export default {
  name: 'project-grim', baseURL: 'http://127.0.0.1:4173',
  command: 'node ../server.js',
  testMatch: ['**/smoke.spec.mjs', '**/project-grim.spec.mjs'],
  routes: [
    { name: 'dm-overview', path: '/dm.html', ready: '#metrics .metric:first-child' },
    { name: 'stage-fallback', path: '/?webgl=0', ready: '#worldStatus', readyText: '2D FALLBACK · 3D unavailable' }
  ],
  visual: 'capture', masks: ['#activityLog'],
  allowedConsoleErrors: [], allowedNetworkErrors: [], blockExternal: true
};
