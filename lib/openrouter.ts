import type { ResearchReport, SourcePage } from "./types";
import { safeJsonParse } from "./utils";

type AiPayload = {
  companyName?: string;
  phone?: string;
  address?: string;
  summary?: string;
  productsServices?: string[];
  painPoints?: string[];
  competitors?: { name: string; website: string; reason?: string }[];
};

export async function analyzeCompany(input: {
  query: string;
  website: string;
  model: string;
  apiKey?: string;
  crawledPages: SourcePage[];
  publicSources: SourcePage[];
}): Promise<ResearchReport> {
  const apiKey = input.apiKey;
  if (!apiKey) {
    throw new Error("Enter an OpenRouter API key in the sidebar.");
  }

  const sourceText = [...input.crawledPages, ...input.publicSources].map((source, index) => (
    `SOURCE ${index + 1}\nTITLE: ${source.title}\nURL: ${source.url}\nTEXT: ${source.excerpt}`
  )).join("\n\n").slice(0, 12000);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Company Intelligence"
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        {
          role: "system",
          content: "You are a precise company research analyst. Return only valid JSON. Use public evidence from the supplied sources. If a field is unavailable, use 'Not publicly listed'. Competitors must operate in a similar industry and preferably the same country."
        },
        {
          role: "user",
          content: `Research input: ${input.query}\nOfficial website: ${input.website}\n\nReturn compact JSON using this schema exactly:\n{\n "companyName": "string",\n "phone": "string",\n "address": "string",\n "summary": "2 concise sentences",\n "productsServices": ["5 concise product or service names"],\n "painPoints": ["4 concise AI-generated business pain points"],\n "competitors": [{"name": "string", "website": "https://...", "reason": "short reason"}]\n}\n\nSources:\n${sourceText}`
        }
      ],
      temperature: 0.25,
      max_tokens: 1400,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<AiPayload>(content, {});

  return {
    companyName: parsed.companyName || input.query,
    website: input.website,
    phone: parsed.phone || "Not publicly listed",
    address: parsed.address || "Not publicly listed",
    summary: parsed.summary || "Summary unavailable from the collected sources.",
    productsServices: (parsed.productsServices ?? []).slice(0, 8),
    painPoints: (parsed.painPoints ?? []).slice(0, 6),
    competitors: (parsed.competitors ?? []).filter((item) => item.name && item.website).slice(0, 6),
    sources: input.crawledPages,
    generatedAt: new Date().toISOString()
  };
}
