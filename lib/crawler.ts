import * as cheerio from "cheerio";
import { compactText, normalizeUrl, sameHost, unique } from "./utils";
import type { SourcePage } from "./types";

const IMPORTANT_PATHS = ["about", "product", "products", "service", "services", "solution", "solutions", "pricing", "contact", "company"];
const BLOCKED_PATHS = ["login", "signin", "signup", "account", "cart", "checkout", "privacy", "terms", "careers/jobs", "wp-admin"];

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 CompanyIntelligenceResearchAssistant/1.0",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractPage(url: string, html: string): SourcePage & { links: string[] } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer").remove();
  const title = compactText($("title").first().text() || $("h1").first().text() || url, 140);
  const chunks = [
    $("meta[name='description']").attr("content") ?? "",
    $("h1, h2, h3, p, li, address").map((_, el) => $(el).text()).get().join(" ")
  ];
  const links = $("a[href]").map((_, el) => $(el).attr("href") ?? "").get();
  return {
    title,
    url,
    excerpt: compactText(chunks.join(" "), 5000),
    links
  };
}

function scoreLink(url: string) {
  const lower = url.toLowerCase();
  if (BLOCKED_PATHS.some((blocked) => lower.includes(blocked))) return -100;
  let score = lower.split("/").length <= 4 ? 2 : 0;
  for (const path of IMPORTANT_PATHS) {
    if (lower.includes(path)) score += 8;
  }
  return score;
}

export async function crawlWebsite(startUrl: string, maxPages = 7) {
  const homepage = normalizeUrl(startUrl);
  const html = await fetchHtml(homepage);
  if (!html) return [];

  const first = extractPage(homepage, html);
  const origin = new URL(homepage).origin;
  const discovered = unique(first.links.map((href) => {
    try {
      return normalizeUrl(new URL(href, origin).toString());
    } catch {
      return "";
    }
  }).filter((url) => url && sameHost(url, homepage) && scoreLink(url) > -100));

  const queue = discovered.sort((a, b) => scoreLink(b) - scoreLink(a)).slice(0, maxPages - 1);
  const pages: SourcePage[] = [first];

  for (const url of queue) {
    const nextHtml = await fetchHtml(url);
    if (!nextHtml) continue;
    const page = extractPage(url, nextHtml);
    if (page.excerpt.length > 180) pages.push(page);
    if (pages.length >= maxPages) break;
  }

  return pages.map(({ title, url, excerpt }) => ({ title, url, excerpt }));
}
