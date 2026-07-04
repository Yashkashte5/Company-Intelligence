export function isUrl(input: string) {
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    return Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string) {
  const withProtocol = input.includes("://") ? input : `https://${input}`;
  const url = new URL(withProtocol);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function sameHost(a: string, b: string) {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function compactText(value: string, max = 9000) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  const cleaned = value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return fallback;
    }
  }
}
