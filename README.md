# customs-exchange-rates

[![npm](https://img.shields.io/npm/v/customs-exchange-rates.svg)](https://www.npmjs.com/package/customs-exchange-rates)
[![license](https://img.shields.io/npm/l/customs-exchange-rates.svg)](LICENSE)

**Customs exchange rates API for Node.js and browsers.** The official exchange rates customs authorities set for customs valuation in 66 clearance countries, asked for by clearance country and declaration date: German Zoll, Dutch Douane, French customs, HMRC, CBSA, US Customs and Border Protection, China Customs, Japan Customs, Korea Customs, SARS, India CBIC and more. TypeScript, zero dependencies.

Built for customs filing and brokerage software, freight forwarding systems, landed-cost and duty calculators, and cross-border checkout.

## Why a separate rate

Customs duty and import VAT are a percentage of customs value, and customs value must be converted into the importing country's currency at the rate **the customs authority of the clearance country** sets for the declaration date. That is not the market rate, and usually not the central bank rate either. Each country has its own table, period (daily, weekly, fortnightly, monthly) and format. This package gives you all of them through one call, keyed by ISO country code, with the date of the table in force so it can be kept with the entry.

## Install

```bash
npm install customs-exchange-rates
```

Get an API key at [allratestoday.com/register](https://allratestoday.com/register). The latest table works on every key; dated lookups (the table in force on a past declaration date) need a [paid plan](https://allratestoday.com/pricing/).

## Usage

```ts
import { CustomsExchangeRates, authorityFor } from 'customs-exchange-rates';

const customs = new CustomsExchangeRates({ apiKey: process.env.ALLRATES_KEY! });

// Goods cleared in Rotterdam, declaration accepted 12 November 2026
const r = await customs.rate('NL', 'USD', 'EUR', { date: '2026-11-12' });
r.rate;            // EUR per 1 USD, from the Dutch customs table in force
r.rate_date;       // the date of that table
r.authority.name;  // "Douane (Netherlands Customs)"

// Customs value of an invoice, with the evidence to keep with the entry
const v = await customs.customsValue(18_400, 'USD', 'NL', '2026-11-12');
// { value: 15xxx.xx, currency: 'EUR', rate, evidence: { country: 'NL', authority: 'douanenl', rate_date, method } }

// The whole table in force today for Japan
const jp = await customs.table('JP');

// Offline: which authority covers a country (no request, no key)
authorityFor('US'); // { authority: 'cbp', name: 'U.S. Customs and Border Protection', currency: 'USD', cadence: 'weekly', ... }
```

### Methods

| Method | What it returns |
|---|---|
| `rate(country, source, target, { date?, type? })` | One pair from the customs table in force, today or on `date` |
| `table(country, { date? })` | The whole customs table in force |
| `customsValue(amount, invoiceCurrency, country, date?)` | The amount in the clearance country's customs currency, plus evidence |
| `next(country, { source?, target? })` | The table already fixed for the next period, for quotes (paid plans) |
| `allCountries(source?)` | Every covered country in one call: `source` → each country's customs currency (paid plans) |
| `countries()` | Every covered clearance country (offline) |
| `authorityFor(country)` / `isCovered(country)` | Catalog lookups (offline) |

`date` is the declaration acceptance date, or the date of exportation for the United States (19 CFR 159). A dated request returns the table in force on that date: the latest table on or before it.

Two-sided tables (India CBIC, Korea Customs) carry import and export rates; pass `{ type: 'import' }` or `{ type: 'export' }`.

### Tables built by rule

Where the customs law names an official series and a date instead of publishing its own table, the API applies the rule and labels the result:

- **EU Member States without a national table** (Spain, Italy, Finland, Greece, Slovakia, Slovenia, Croatia, the Baltics, Malta, Bulgaria) and **Hungary, Romania, Denmark:** Art. 146 of Implementing Regulation (EU) 2015/2447, the ECB or national rate of the second last Wednesday, applied the following month. It matches the French, Belgian and German customs tables exactly.
- **Brazil (`brcustoms`):** the BCB PTAX selling rate of the business day before the DI/DUIMP registration.
- **Russia and Saudi Arabia:** the law names the Bank of Russia / SAMA rate on the declaration or payment date, so the answer is that table itself, with `customs_rule` citing the law.

- **US (`cbp`):** rates certified by the Federal Reserve Bank of New York, per 19 CFR 159 Subpart C: a quarterly rate for the listed currencies, replaced by the daily rate on days it moves 5% or more, and the daily rate for the rest. These are the Federal Reserve H.10 figures.
- **China (`gacc`):** GACC Order 272 Article 13: the CFETS central parity of the third Wednesday of the previous month.

Those responses carry `method: 'rule'`, `derived: true` and a `basis` object naming the series and the rule.

## Coverage

53 customs authorities, 66 clearance countries:

<!-- coverage:start -->
| Country | Code | Customs authority | Currency | Cadence |
|---|---|---|---|---|
| Argentina | `AR` | [ARCA Customs (Argentina)](https://allratestoday.com/tax-authority-rates-api/arcamaria/) | ARS | daily |
| Australia | `AU` | [Australian Border Force](https://allratestoday.com/tax-authority-rates-api/abf/) | AUD | daily |
| Austria | `AT` | [Austrian Ministry of Finance (BMF)](https://allratestoday.com/tax-authority-rates-api/bmfat/) | EUR | monthly |
| Bangladesh | `BD` | [Bangladesh National Board of Revenue (customs rates)](https://allratestoday.com/tax-authority-rates-api/nbrbd/) | BDT | monthly |
| Belgium | `BE` | [Belgian Customs (FPS Finance)](https://allratestoday.com/tax-authority-rates-api/tarbel/) | EUR | monthly |
| Belize | `BZ` | [Belize Customs and Excise](https://allratestoday.com/tax-authority-rates-api/customsbz/) | BZD | weekly |
| Bermuda | `BM` | [Bermuda Customs](https://allratestoday.com/tax-authority-rates-api/bermudacustoms/) | BMD | weekly |
| Brazil | `BR` | [Brazil customs exchange rate (Siscomex, PTAX)](https://allratestoday.com/tax-authority-rates-api/brcustoms/) | BRL | daily |
| Bulgaria | `BG` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Cambodia | `KH` | [Cambodia General Department of Customs and Excise](https://allratestoday.com/tax-authority-rates-api/gdce/) | KHR | daily |
| Canada | `CA` | [Canada Border Services Agency](https://allratestoday.com/tax-authority-rates-api/cbsa/) | CAD | daily |
| Chile | `CL` | [Servicio Nacional de Aduanas (Chile customs)](https://allratestoday.com/tax-authority-rates-api/aduanacl/) | CLP | monthly |
| China | `CN` | [General Administration of Customs of China (GACC)](https://allratestoday.com/tax-authority-rates-api/gacc/) | CNY | monthly |
| Croatia | `HR` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Cyprus | `CY` | [Cyprus Department of Customs and Excise](https://allratestoday.com/tax-authority-rates-api/cycustoms/) | EUR | monthly |
| Czechia | `CZ` | [Czech Customs Administration](https://allratestoday.com/tax-authority-rates-api/celnisprava/) | CZK | monthly |
| Denmark | `DK` | [Denmark customs exchange rates (UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/dkcustoms/) | DKK | monthly |
| Dominican Republic | `DO` | [DGA (Dominican Republic customs)](https://allratestoday.com/tax-authority-rates-api/dgado/) | DOP | daily |
| Estonia | `EE` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Finland | `FI` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| France | `FR` | [French Customs (DGDDI)](https://allratestoday.com/tax-authority-rates-api/douanefr/) | EUR | monthly |
| Germany | `DE` | [German Customs (Zoll)](https://allratestoday.com/tax-authority-rates-api/zollde/) | EUR | monthly |
| Ghana | `GH` | [Ghana Revenue Authority Customs (ICUMS)](https://allratestoday.com/tax-authority-rates-api/icumsgh/) | GHS | weekly |
| Greece | `GR` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Guyana | `GY` | [Guyana Revenue Authority (customs rates)](https://allratestoday.com/tax-authority-rates-api/gracustoms/) | GYD | monthly |
| Hungary | `HU` | [Hungary customs exchange rates (UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/hucustoms/) | HUF | monthly |
| Iceland | `IS` | [Iceland Revenue and Customs (Skatturinn)](https://allratestoday.com/tax-authority-rates-api/tollgengi/) | ISK | weekly |
| India | `IN` | [Central Board of Indirect Taxes and Customs (CBIC)](https://allratestoday.com/tax-authority-rates-api/cbic/) | INR | fortnightly |
| Indonesia | `ID` | [Indonesia Ministry of Finance (Kurs Pajak)](https://allratestoday.com/tax-authority-rates-api/kurspajak/) | IDR | weekly |
| Ireland | `IE` | [Revenue Commissioners (Ireland customs rates)](https://allratestoday.com/tax-authority-rates-api/revenueie/) | EUR | monthly |
| Italy | `IT` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Japan | `JP` | [Japan Customs](https://allratestoday.com/tax-authority-rates-api/jpcustoms/) | JPY | weekly |
| Jordan | `JO` | [Jordan Customs Department](https://allratestoday.com/tax-authority-rates-api/jocustoms/) | JOD | monthly |
| Kenya | `KE` | [Kenya Revenue Authority (customs rates)](https://allratestoday.com/tax-authority-rates-api/kra/) | KES | weekly |
| Latvia | `LV` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Liechtenstein | `LI` | [Swiss Federal Office for Customs and Border Security](https://allratestoday.com/tax-authority-rates-api/bazg/) | CHF | daily |
| Lithuania | `LT` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Luxembourg | `LU` | [Luxembourg Customs and Excise](https://allratestoday.com/tax-authority-rates-api/douaneslu/) | EUR | monthly |
| Madagascar | `MG` | [Madagascar Customs (Douanes)](https://allratestoday.com/tax-authority-rates-api/douanesmg/) | MGA | weekly |
| Malta | `MT` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Mauritius | `MU` | [Mauritius Revenue Authority (Customs)](https://allratestoday.com/tax-authority-rates-api/mramu/) | MUR | weekly |
| Monaco | `MC` | [French Customs (DGDDI)](https://allratestoday.com/tax-authority-rates-api/douanefr/) | EUR | monthly |
| Netherlands | `NL` | [Douane (Netherlands Customs)](https://allratestoday.com/tax-authority-rates-api/douanenl/) | EUR | monthly |
| New Zealand | `NZ` | [New Zealand Customs Service](https://allratestoday.com/tax-authority-rates-api/nzcustoms/) | NZD | fortnightly |
| North Macedonia | `MK` | [North Macedonia Customs Administration](https://allratestoday.com/tax-authority-rates-api/customsmk/) | MKD | monthly |
| Norway | `NO` | [Norwegian Customs (Tolletaten)](https://allratestoday.com/tax-authority-rates-api/tolletaten/) | NOK | fortnightly |
| Paraguay | `PY` | [DNIT (Paraguay tax and customs authority)](https://allratestoday.com/tax-authority-rates-api/dnit/) | PYG | daily |
| Peru | `PE` | [SUNAT (Peru tax and customs authority)](https://allratestoday.com/tax-authority-rates-api/sunat/) | PEN | daily |
| Poland | `PL` | [Poland Ministry of Finance customs rates](https://allratestoday.com/tax-authority-rates-api/kaspl/) | PLN | monthly |
| Portugal | `PT` | [Portugal Tax and Customs Authority (AT)](https://allratestoday.com/tax-authority-rates-api/atpt/) | EUR | monthly |
| Romania | `RO` | [Romania customs exchange rates (UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/rocustoms/) | RON | monthly |
| Russia | `RU` | [Bank of Russia](https://allratestoday.com/central-bank-rates-api/cbr/) | RUB | per notice |
| Saudi Arabia | `SA` | [Saudi Central Bank (SAMA)](https://allratestoday.com/central-bank-rates-api/sama/) | SAR | per notice |
| Serbia | `RS` | [Serbia Customs Administration](https://allratestoday.com/tax-authority-rates-api/carinars/) | RSD | weekly |
| Slovakia | `SK` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Slovenia | `SI` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| South Africa | `ZA` | [SARS customs rates of exchange](https://allratestoday.com/tax-authority-rates-api/sarsrex/) | ZAR | daily |
| South Korea | `KR` | [Korea Customs Service](https://allratestoday.com/tax-authority-rates-api/kcs/) | KRW | weekly |
| Spain | `ES` | [EU customs exchange rates (euro area, UCC Art. 146)](https://allratestoday.com/tax-authority-rates-api/eucustoms/) | EUR | monthly |
| Sri Lanka | `LK` | [Sri Lanka Customs](https://allratestoday.com/tax-authority-rates-api/lkcustoms/) | LKR | weekly |
| Sweden | `SE` | [Swedish Customs (Tullverket)](https://allratestoday.com/tax-authority-rates-api/tullverket/) | SEK | monthly |
| Switzerland | `CH` | [Swiss Federal Office for Customs and Border Security](https://allratestoday.com/tax-authority-rates-api/bazg/) | CHF | daily |
| Thailand | `TH` | [Thai Customs Department](https://allratestoday.com/tax-authority-rates-api/thcustoms/) | THB | monthly |
| Uganda | `UG` | [Uganda Revenue Authority](https://allratestoday.com/tax-authority-rates-api/ura/) | UGX | per notice |
| United Kingdom | `GB` | [HM Revenue & Customs](https://allratestoday.com/tax-authority-rates-api/hmrc/) | GBP | monthly |
| United States | `US` | [U.S. Customs and Border Protection](https://allratestoday.com/tax-authority-rates-api/cbp/) | USD | weekly |
<!-- coverage:end -->

Missing a clearance country? [Tell us which one](https://allratestoday.com/contact?tab=business&topic=tax_authority_data).

## REST API

The package wraps these endpoints, which any language can call:

```bash
# Which authority covers which country (no key)
curl https://allratestoday.com/api/v1/customs

# The table in force on a declaration date
curl "https://allratestoday.com/api/v1/customs/NL/2026-11-12?source=USD&target=EUR" \
  -H "Authorization: Bearer YOUR_KEY"
```

Every endpoint also returns CSV, XML or XLSX with `?format=csv|xml|xlsx`. See the [customs exchange rate API page](https://allratestoday.com/customs-exchange-rate-api/) and the [OpenAPI spec](https://allratestoday.com/openapi.json).

## 🔗 Links

- **Website:** [allratestoday.com](https://allratestoday.com)
- [Customs Exchange Rate API](https://allratestoday.com/customs-exchange-rate-api/)
- [Tax and customs authority rates](https://allratestoday.com/tax-authority-rates-api/)
- [Customs rates for finance teams](https://allratestoday.com/for-finance-teams/customs-exchange-rates/)
- [API Documentation](https://allratestoday.com/developers)
- [Register (Free)](https://allratestoday.com/register)
- [Status](https://allratestoday.com/status)
- [GitHub](https://github.com/AllRates-Today/customs-exchange-rates)

## 📜 License

MIT
