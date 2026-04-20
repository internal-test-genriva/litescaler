export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: 'Method not allowed',
      details: 'Use POST /api/domain-check with JSON body: { "domain": "example.com" }'
    }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};

type TldPricing = {
  tld: string;
  register1: number | null;
  renew1: number | null;
  transfer1: number | null;
};

let tldPricingCache:
  | { fetchedAt: number; currencyid: string | undefined; payload: any }
  | undefined;

function pickTldKey(domain: string, pricing: Record<string, any>): string | null {
  const labels = domain.split('.').filter(Boolean);
  if (labels.length < 2) return null;

  // WHMCS GetTLDPricing keys are TLD strings like "com" or "co.in"
  for (let i = 1; i < labels.length; i++) {
    const candidate = labels.slice(i).join('.');
    if (pricing?.[candidate]) return candidate;
  }
  // Fallback to last label
  const last = labels.at(-1);
  if (!last) return null;
  return pricing?.[last] ? last : null;
}

function toNumberOrNull(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

async function callWhmcsApi(whmcsUrl: string, params: URLSearchParams) {
  const response = await fetch(whmcsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const raw = await response.text().catch(() => '');
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      statusText: response.statusText,
      body: raw.slice(0, 4000)
    };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? JSON.parse(raw) : { raw };
  return { ok: true as const, data };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const whmcsUrl = import.meta.env.WHMCS_API_URL ?? 'https://billing.litescaler.com/includes/api.php';
    const whmcsIdentifier = import.meta.env.WHMCS_IDENTIFIER;
    const whmcsSecret = import.meta.env.WHMCS_SECRET;
    const whmcsCurrencyId = import.meta.env.WHMCS_CURRENCY_ID as string | undefined;

    if (!whmcsIdentifier || !whmcsSecret) {
      return new Response(
        JSON.stringify({
          error: 'WHMCS is not configured',
          details: 'Missing WHMCS_IDENTIFIER / WHMCS_SECRET environment variables.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1) Availability
    const whoisParams = new URLSearchParams();
    whoisParams.append('action', 'DomainWhois');
    whoisParams.append('identifier', whmcsIdentifier);
    whoisParams.append('secret', whmcsSecret);
    whoisParams.append('domain', domain);
    whoisParams.append('responsetype', 'json');

    const whoisRes = await callWhmcsApi(whmcsUrl, whoisParams);
    if (!whoisRes.ok) {
      return new Response(
        JSON.stringify({
          error: 'WHMCS API request failed',
          status: whoisRes.status,
          statusText: whoisRes.statusText,
          body: whoisRes.body
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const whoisData = whoisRes.data;

    // 2) Pricing (cached)
    const now = Date.now();
    const cacheTtlMs = 10 * 60 * 1000;
    const cacheValid =
      tldPricingCache &&
      now - tldPricingCache.fetchedAt < cacheTtlMs &&
      tldPricingCache.currencyid === whmcsCurrencyId;

    let pricingPayload: any = cacheValid ? tldPricingCache!.payload : undefined;
    if (!pricingPayload) {
      const pricingParams = new URLSearchParams();
      pricingParams.append('action', 'GetTLDPricing');
      pricingParams.append('identifier', whmcsIdentifier);
      pricingParams.append('secret', whmcsSecret);
      if (whmcsCurrencyId) pricingParams.append('currencyid', whmcsCurrencyId);
      pricingParams.append('responsetype', 'json');

      const pricingRes = await callWhmcsApi(whmcsUrl, pricingParams);
      if (pricingRes.ok) {
        pricingPayload = pricingRes.data;
        tldPricingCache = { fetchedAt: now, currencyid: whmcsCurrencyId, payload: pricingPayload };
      } else {
        pricingPayload = {
          result: 'error',
          message: 'GetTLDPricing failed',
          status: pricingRes.status,
          statusText: pricingRes.statusText,
          body: pricingRes.body
        };
      }
    }

    let tldPricing: TldPricing | null = null;
    if (pricingPayload?.result === 'success' && pricingPayload?.pricing) {
      const tldKey = pickTldKey(String(domain).toLowerCase(), pricingPayload.pricing);
      const tldItem = tldKey ? pricingPayload.pricing[tldKey] : null;
      if (tldKey && tldItem) {
        tldPricing = {
          tld: tldKey,
          register1: toNumberOrNull(tldItem?.register?.['1']),
          renew1: toNumberOrNull(tldItem?.renew?.['1']),
          transfer1: toNumberOrNull(tldItem?.transfer?.['1'])
        };
      }
    }

    return new Response(
      JSON.stringify({
        result: whoisData?.result ?? 'success',
        status: whoisData?.status,
        whois: whoisData?.whois,
        currency: pricingPayload?.currency ?? null,
        tldPricing,
        pricingResult: pricingPayload?.result ?? null,
        pricingMessage: pricingPayload?.message ?? null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WHMCS API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to connect to WHMCS' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
