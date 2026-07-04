import { isUrl, normalizeUrl } from "./utils";

type SerperResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

export async function serperSearch(query: string, limit = 8, apiKey?: string) {
  if (!apiKey) {
    throw new Error("Enter a Serper.dev API key in the sidebar.");
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ q: query, num: limit })
  });

  if (!response.ok) {
    throw new Error(`Serper search failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return ((data.organic ?? []) as SerperResult[]).slice(0, limit);
}

export async function resolveOfficialWebsite(input: string, apiKey?: string) {
  if (isUrl(input)) return normalizeUrl(input);

  const results = await serperSearch(`${input} official website company`, 6, apiKey);
  const first = results.find((result) => {
    if (!result.link) return false;
    const blocked = ["linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "wikipedia.org", "crunchbase.com"];
    return !blocked.some((domain) => result.link!.includes(domain));
  });

  if (!first?.link) {
    throw new Error("Could not identify the official website from search results.");
  }

  return normalizeUrl(first.link);
}

export async function gatherPublicResearch(companyName: string, website: string, apiKey?: string) {
  const queries = [
    `${companyName} company address phone products services`,
    `${companyName} competitors same industry`,
    `${companyName} recent business overview pain points`
  ];
  const groups = await Promise.all(queries.map((query) => serperSearch(query, 5, apiKey).catch(() => [])));
  return groups.flat().filter((item) => item.link && item.snippet).map((item) => ({
    title: item.title ?? "Search result",
    url: item.link!,
    excerpt: item.snippet ?? ""
  })).filter((item) => !item.url.includes(website));
}
