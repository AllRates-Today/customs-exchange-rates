import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CustomsExchangeRates, CustomsExchangeRatesError, countries, authorityFor, isCovered, COUNTRY_COUNT, AUTHORITY_COUNT } from '../dist/index.mjs';

const fake = (body, status = 200, seen = []) => async (url, init) => {
  seen.push({ url, init });
  return new Response(JSON.stringify(body), { status });
};

test('catalog is offline and consistent', () => {
  assert.equal(countries().length, COUNTRY_COUNT);
  assert.ok(AUTHORITY_COUNT >= 40);
  assert.equal(authorityFor('nl').authority, 'douanenl');
  assert.equal(authorityFor('US').authority, 'cbp');
  assert.equal(authorityFor('CN').authority, 'gacc');
  assert.equal(authorityFor('LI').authority, 'bazg');
  assert.equal(isCovered('XX'), false);
});

test('rate() builds the dated request and sends the key', async () => {
  const seen = [];
  const c = new CustomsExchangeRates({ apiKey: 'k1', fetch: fake({ rate: 0.9 }, 200, seen) });
  await c.rate('nl', 'usd', 'eur', { date: new Date('2026-11-12T10:00:00Z') });
  assert.equal(seen[0].url, 'https://allratestoday.com/api/v1/customs/NL/2026-11-12?source=USD&target=EUR');
  assert.equal(seen[0].init.headers.Authorization, 'Bearer k1');
  await c.table('JP');
  assert.equal(seen[1].url, 'https://allratestoday.com/api/v1/customs/JP/latest');
});

test('customsValue() converts and returns evidence', async () => {
  const body = { clearance_country: 'NL', authority: { code: 'douanenl' }, rate_date: '2026-11-01', rate: 0.86, method: 'inverse' };
  const c = new CustomsExchangeRates({ apiKey: 'k', fetch: fake(body) });
  const v = await c.customsValue(18400, 'USD', 'NL', '2026-11-12');
  assert.equal(v.currency, 'EUR');
  assert.equal(v.value, 15824);
  assert.deepEqual(v.evidence, { country: 'NL', authority: 'douanenl', rate_date: '2026-11-01', method: 'inverse' });
});

test('errors carry status and the API message', async () => {
  const c = new CustomsExchangeRates({ apiKey: 'k', fetch: fake({ error: "No customs exchange rate table for country 'XX' yet." }, 404) });
  await assert.rejects(c.rate('XX', 'USD', 'EUR'), (e) => e instanceof CustomsExchangeRatesError && e.status === 404 && /XX/.test(e.message));
  assert.throws(() => new CustomsExchangeRates({ apiKey: '' }), CustomsExchangeRatesError);
  await assert.rejects(c.rate('USA', 'USD', 'EUR'), CustomsExchangeRatesError);
});
