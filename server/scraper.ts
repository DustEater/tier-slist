import * as cheerio from "cheerio";

export interface ScrapedProductInfo {
  name: string | null;
  price: number | null;
  currency: string | null;
}

const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function scrapeProductInfo(
  url: string,
): Promise<ScrapedProductInfo> {
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch {
    html = await fetchMobileFallback(url);
  }
  const $ = cheerio.load(html);

  const result: ScrapedProductInfo = {
    name: null,
    price: null,
    currency: null,
  };

  tryJsonLd($, result);
  tryJdPageConfig($, result);
  tryMicrodata($, result);
  tryOpenGraph($, result);
  tryTitleTag($, result);

  return result;
}

async function fetchMobileFallback(url: string): Promise<string> {
  const mobileUrl = url
    .replace(/^https?:\/\/item\.jd\.com\//, "https://item.m.jd.com/product/")
    .replace(/^https?:\/\/detail\.tmall\.com\//, "https://detail.m.tmall.com/")
    .replace(/^https?:\/\/detail\.taobao\.com\//, "https://m.taobao.com/detail/");

  if (mobileUrl === url) throw new Error("no mobile fallback");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(mobileUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; SM-S9080) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buf = await response.arrayBuffer();
    return decodeHtml(buf);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buf = await response.arrayBuffer();
    const decoded = decodeHtml(buf);
    return decoded;
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtml(buf: ArrayBuffer): string {
  const raw = new Uint8Array(buf);
  const snippet = new TextDecoder("utf-8", { fatal: false }).decode(
    raw.slice(0, 2048),
  );

  const charsetMatch =
    snippet.match(/charset=["']?([^"'\s>]+)/i)?.[1]?.toLowerCase() ?? "";
  const knownCharsets: Record<string, string> = {
    gbk: "gbk",
    "gb2312": "gbk",
    "gb18030": "gbk",
    "shift-jis": "shift-jis",
    big5: "big5",
  };

  const encoding = knownCharsets[charsetMatch] ?? "utf-8";
  return new TextDecoder(encoding, { fatal: false }).decode(raw);
}

function tryJsonLd(
  $: cheerio.CheerioAPI,
  result: ScrapedProductInfo,
): void {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      const raw = $(el).text().trim();
      if (!raw) continue;
      const data = JSON.parse(raw);
      extractJsonLdProduct(data, result);
    } catch {
      continue;
    }
  }
}

function tryJdPageConfig(
  $: cheerio.CheerioAPI,
  result: ScrapedProductInfo,
): void {
  if (result.name) return;

  const scripts = $("script").toArray();
  for (const el of scripts) {
    const text = $(el).text();
    const match = text.match(/var pageConfig\s*=\s*({[\s\S]*?});/);
    if (!match) continue;

    try {
      const config = new Function(`return (${match[1]})`)();
      if (
        config &&
        typeof config === "object" &&
        typeof (config as Record<string, unknown>).product === "object" &&
        (config as Record<string, unknown>).product !== null
      ) {
        const product = (config as Record<string, unknown>)
          .product as Record<string, unknown>;
        if (typeof product.name === "string" && product.name.trim()) {
          result.name = product.name.trim();
          return;
        }
      }
    } catch {
      continue;
    }
  }
}

function extractJsonLdProduct(
  data: unknown,
  result: ScrapedProductInfo,
): void {
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;

    if (obj["@type"] === "Product" || obj["@type"] === "product") {
      pickName(result, obj["name"]);
      const offers = obj["offers"];
      if (typeof offers === "object" && offers !== null) {
        const o = offers as Record<string, unknown>;

        if (o["@type"] === "AggregateOffer") {
          pickPrice(result, o["lowPrice"]);
        } else {
          pickPrice(result, o["price"]);
        }
        pickCurrency(result, o["priceCurrency"]);
      }
      return;
    }

    if (
      obj["@type"] === "ItemPage" &&
      typeof obj["mainEntity"] === "object" &&
      obj["mainEntity"] !== null
    ) {
      extractJsonLdProduct(obj["mainEntity"], result);
    }
  }
}

function tryMicrodata(
  $: cheerio.CheerioAPI,
  result: ScrapedProductInfo,
): void {
  if (!result.name) {
    const nameEl = $('[itemprop="name"]').first();
    const name = nameEl.attr("content") ?? nameEl.text().trim();
    if (name) {
      result.name = cleanName(name);
    }
  }

  if (!result.price) {
    const priceEl = $('[itemprop="price"]').first();
    const price = priceEl.attr("content") ?? priceEl.text().trim();
    if (price) {
      result.price = parsePrice(price);
    }
    const currency = $('[itemprop="priceCurrency"]').first().attr("content");
    if (currency) {
      result.currency = currency;
    }
  }
}

function tryOpenGraph(
  $: cheerio.CheerioAPI,
  result: ScrapedProductInfo,
): void {
  if (!result.name) {
    const title = $('meta[property="og:title"]').attr("content");
    if (title) {
      result.name = cleanName(title);
    }
  }

  if (!result.price) {
    const price =
      $('meta[property="product:price:amount"]').attr("content") ??
      $('meta[property="og:price:amount"]').attr("content");
    if (price) {
      result.price = parsePrice(price);
    }
  }

  if (!result.currency) {
    const currency =
      $('meta[property="product:price:currency"]').attr("content") ??
      $('meta[property="og:price:currency"]').attr("content");
    if (currency) {
      result.currency = currency;
    }
  }
}

function tryTitleTag(
  $: cheerio.CheerioAPI,
  result: ScrapedProductInfo,
): void {
  if (result.name) return;

  const title = $("title").first().text().trim();
  if (!title) return;

  const cleaned = title
    .replace(/[-–—|_•·,，。！!？?]+[\s\S]*$/, "")
    .trim();

  if (cleaned && cleaned.length < 120) {
    result.name = cleaned;
  }
}

function pickName(result: ScrapedProductInfo, value: unknown): void {
  if (result.name) return;
  if (typeof value === "string") {
    const cleaned = cleanName(value);
    if (cleaned) result.name = cleaned;
  }
}

function pickPrice(result: ScrapedProductInfo, value: unknown): void {
  if (result.price !== null) return;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = parsePrice(String(value));
    if (parsed !== null) result.price = parsed;
  }
}

function pickCurrency(result: ScrapedProductInfo, value: unknown): void {
  if (result.currency) return;
  if (typeof value === "string") result.currency = value;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const v = Number.parseFloat(cleaned);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
}