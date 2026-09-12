// Offline regression checks: node tests/calculator.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function compile(path, imports) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), console, setTimeout, URL, Object });
  return exports;
}
let calls = 0;
const api = compile('src/app/api/calculator/route.ts', {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  '@/lib/geocode': {
    FALLBACK_ORIGINS: { A: { lat: 37.5, lng: 127 }, B: { lat: 37.6, lng: 127 } },
    geocodeDetailed: async () => null,
  },
  '@/lib/odsay': {
    estimateTaxi: () => ({ oneWayMinutes: 20, oneWayFare: 15000 }),
    haversineKm: () => 10,
    getRoute: async () => { calls++; throw new Error("Unexpected external route request"); },
    estimateRoute: () => ({ oneWayMinutes: 35, oneWayFare: 1400 }),
  },
});
async function post(body) { return api.POST({ json: async () => body }); }
(async () => {
  assert.equal((await post({ origin: '', destination: 'B' })).status, 400);
  assert.equal((await post({ origin: 42, destination: 'B' })).status, 400);
  assert.equal((await post({ origin: 'unknown', destination: 'B' })).status, 422);
  const estimated = await post({ origin: 'A', destination: 'B' });
  assert.equal(estimated.body.source, 'estimate');
  assert.equal(calls, 0);
  assert.equal(estimated.body.routes.WALK.oneWayFare, 0);
  assert.equal(estimated.body.routes.WALK.oneWayMinutes, 195);
  assert.equal(estimated.body.routes.BUS.oneWayFare, 1400);
  assert.equal(estimated.body.routes.TAXI.oneWayFare, 15000);
  const same = await post({ origin: 'A', destination: 'A' });
  for (const route of Object.values(same.body.routes)) {
    assert.equal(route.oneWayMinutes, 0);
    assert.equal(route.oneWayFare, 0);
  }
  assert.equal(calls, 0);
  const { calcRealWage } = compile('src/lib/calc.ts', {});
  const result = calcRealWage({ hourlyWage: 12000, dailyWorkHours: 5, ...estimated.body.routes.BUS });
  assert.equal(result.realHourlyWage, 9276);
  assert.equal(result.dailyNetPay, 57200);
  const walk = calcRealWage({ hourlyWage: 12000, dailyWorkHours: 5, ...estimated.body.routes.WALK });
  const taxi = calcRealWage({ hourlyWage: 12000, dailyWorkHours: 5, ...estimated.body.routes.TAXI });
  assert.equal(walk.dailyCommuteCost, 0);
  assert.equal(taxi.dailyCommuteCost, 30000);
  assert.notEqual(walk.realHourlyWage, result.realHourlyWage);
  assert.notEqual(taxi.realHourlyWage, result.realHourlyWage);
  const negative = calcRealWage({ hourlyWage: 100, dailyWorkHours: 1, oneWayMinutes: 35, oneWayFare: 1400 });
  assert.ok(negative.dailyNetPay < 0);
  console.log('Calculator checks passed: invalid input, unresolved place, three travel modes, same place, wage calculation. No external API calls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
