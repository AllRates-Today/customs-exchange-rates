/**
 * customs-exchange-rates: the official exchange rates customs authorities set
 * for customs valuation, by clearance country, through the AllRatesToday API.
 *
 * Customs value has to be converted at the rate the customs authority of the
 * clearance country sets for the declaration date (German Zoll, Dutch Douane,
 * HMRC, CBSA, US CBP, China Customs, Japan Customs, ...), not a market rate.
 * This package asks for that rate by ISO country code.
 *
 * Docs: https://allratestoday.com/customs-exchange-rate-api/
 */
import catalogData from './catalog.json';

const DEFAULT_BASE_URL = 'https://allratestoday.com';

// ---------------------------------------------------------------- catalog

export interface CustomsCountry {
  /** Clearance country, ISO 3166-1 alpha-2, upper case, e.g. `NL`. */
  country: string;
  countryName: string;
  /** Source code of the customs authority whose table applies, e.g. `douanenl`. */
  authority: string;
  /** The authority's name. */
  name: string;
  /** Currency customs value is declared in, e.g. `EUR`. */
  currency: string;
  /** How often the authority sets a new table: daily, weekly, fortnightly, monthly. */
  cadence: string;
  /** Source page with the rule, latest table and history. */
  page: string;
}

const catalog = catalogData as { countries: CustomsCountry[] };

/** Every covered clearance country. Offline: no request, no key. */
export function countries(): CustomsCountry[] {
  return catalog.countries;
}

/** The customs authority for a clearance country, or `undefined` if not covered. Offline. */
export function authorityFor(countryCode: string): CustomsCountry | undefined {
  const cc = countryCode.trim().toUpperCase();
  return catalog.countries.find((c) => c.country === cc);
}

/** True when the clearance country is covered. Offline. */
export function isCovered(countryCode: string): boolean {
  return authorityFor(countryCode) !== undefined;
}

/** Number of covered clearance countries in the bundled catalog. */
export const COUNTRY_COUNT: number = catalog.countries.length;
/** Number of distinct customs authorities in the bundled catalog. */
export const AUTHORITY_COUNT: number = new Set(catalog.countries.map((c) => c.authority)).size;

// ---------------------------------------------------------------- API types

export interface Authority {
  code: string;
  name: string;
  country: string;
  page: string;
}

/** Set on tables AllRatesToday computes by applying an authority's rule to an official series (US CBP, China Customs). */
export interface RuleBasis {
  method: 'rule';
  /** The official series the rule is applied to, e.g. `fed`. */
  from: string;
  /** The legal rule, e.g. `19 CFR 159 Subpart C`. */
  rule: string;
  note: string;
}

export interface CustomsPairResponse {
  clearance_country: string;
  authority: Authority;
  bank: string;
  name: string;
  /** The date of the authority's table in force (not when it was fetched). */
  rate_date: string;
  source: string;
  target: string;
  /** Amount of `target` per 1 `source`. */
  rate: number;
  rate_type: string;
  /** True when inverted or cross-computed from the table, or built by rule. */
  derived: boolean;
  method: string;
  basis?: RuleBasis;
  age_days?: number;
  stale?: boolean;
  cadence?: string;
  disclaimer?: string;
  [extra: string]: unknown;
}

export interface CustomsRow {
  base: string;
  quote: string;
  type: string;
  /** Amount of `quote` per 1 `base`. */
  value: number;
}

export interface CustomsTableResponse {
  clearance_country: string;
  authority: Authority;
  bank: string;
  name: string;
  rate_date: string;
  rates: CustomsRow[];
  basis?: RuleBasis;
  age_days?: number;
  stale?: boolean;
  cadence?: string;
  disclaimer?: string;
  [extra: string]: unknown;
}

export interface ClientOptions {
  /** Your AllRatesToday API key. Free key: https://allratestoday.com/register */
  apiKey: string;
  baseUrl?: string;
  /** Request timeout in milliseconds (default 15000). */
  timeout?: number;
  /** Custom fetch, e.g. for tests or old runtimes. Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
}

export class CustomsExchangeRatesError extends Error {
  status?: number;
  body?: unknown;
  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'CustomsExchangeRatesError';
    this.status = status;
    this.body = body;
  }
}

type DateLike = string | Date;

const isoDate = (d: DateLike): string => {
  const s = typeof d === 'string' ? d : d.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new CustomsExchangeRatesError(`date must be YYYY-MM-DD, got ${s}`);
  return s;
};

export interface CustomsValue {
  /** The amount converted into the clearance country's customs currency, rounded to 2 decimals. */
  value: number;
  currency: string;
  rate: number;
  /** Evidence to keep with the entry: which authority, which table date. */
  evidence: { country: string; authority: string; rate_date: string; method: string; rule?: string };
}

// ---------------------------------------------------------------- client

/**
 * Client for the customs exchange rate endpoints. Dated lookups and history
 * need a paid plan; see https://allratestoday.com/pricing/
 *
 * ```ts
 * const customs = new CustomsExchangeRates({ apiKey: process.env.ALLRATES_KEY! });
 * const r = await customs.rate('NL', 'USD', 'EUR', { date: '2026-11-12' });
 * r.rate; r.rate_date; r.authority.name; // Douane (Netherlands Customs)
 * ```
 */
export class CustomsExchangeRates {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private fetchImpl: typeof fetch;

  constructor(opts: ClientOptions) {
    if (!opts?.apiKey) throw new CustomsExchangeRatesError('apiKey is required. Get a free key at https://allratestoday.com/register');
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = opts.timeout ?? 15000;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async get<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
    const qs = Object.entries(query).filter(([, v]) => v !== undefined) as Array<[string, string]>;
    const url = `${this.baseUrl}${path}${qs.length ? '?' + new URLSearchParams(qs).toString() : ''}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    try {
      const res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' }, signal: ctrl.signal });
      const text = await res.text();
      let body: unknown = text;
      try { body = JSON.parse(text); } catch { /* not JSON */ }
      if (!res.ok) {
        const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
        throw new CustomsExchangeRatesError(msg, res.status, body);
      }
      return body as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private path(country: string, date?: DateLike): string {
    const cc = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) throw new CustomsExchangeRatesError(`country must be an ISO alpha-2 code, got ${country}`);
    return `/api/v1/customs/${cc}/${date === undefined ? 'latest' : isoDate(date)}`;
  }

  /** The whole customs table in force for a clearance country, today or on `date`. */
  async table(country: string, opts: { date?: DateLike } = {}): Promise<CustomsTableResponse> {
    return this.get(this.path(country, opts.date));
  }

  /**
   * One pair from the customs table in force for the clearance country.
   * `date` is the declaration acceptance date (or the date of exportation for the US).
   */
  async rate(country: string, source: string, target: string, opts: { date?: DateLike; type?: string } = {}): Promise<CustomsPairResponse> {
    return this.get(this.path(country, opts.date), { source: source.toUpperCase(), target: target.toUpperCase(), type: opts.type });
  }

  /**
   * Customs value of an invoice amount in the clearance country's currency.
   *
   * ```ts
   * const v = await customs.customsValue(18400, 'USD', 'NL', '2026-11-12');
   * v.value; // EUR amount; v.evidence → keep with the entry
   * ```
   */
  async customsValue(amount: number, invoiceCurrency: string, country: string, date?: DateLike): Promise<CustomsValue> {
    const meta = authorityFor(country);
    const currency = meta?.currency ?? (await this.table(country, { date })).rates[0]?.quote;
    if (!currency) throw new CustomsExchangeRatesError(`no customs currency known for ${country}`);
    const r = await this.rate(country, invoiceCurrency, currency, { date });
    return {
      value: Math.round(amount * r.rate * 100) / 100,
      currency,
      rate: r.rate,
      evidence: { country: r.clearance_country, authority: r.authority.code, rate_date: r.rate_date, method: r.method, ...(r.basis ? { rule: r.basis.rule } : {}) },
    };
  }
}

export default CustomsExchangeRates;
