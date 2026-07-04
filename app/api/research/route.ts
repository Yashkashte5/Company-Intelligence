import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crawlWebsite } from "@/lib/crawler";
import { sendDiscordReport } from "@/lib/discord";
import { analyzeCompany } from "@/lib/openrouter";
import { createReportPdf } from "@/lib/pdf";
import { gatherPublicResearch, resolveOfficialWebsite } from "@/lib/serper";

export const runtime = "nodejs";

const requestSchema = z.object({
  query: z.string().min(2),
  model: z.string().min(2).default("anthropic/claude-sonnet-4.5"),
  apiKeys: z.object({
    serper: z.string().optional(),
    openrouter: z.string().optional()
  }).optional(),
  discord: z.object({
    botToken: z.string().optional(),
    channelId: z.string().optional(),
    applicantName: z.string().optional(),
    applicantEmail: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const website = await resolveOfficialWebsite(body.query, body.apiKeys?.serper);
    const crawledPages = await crawlWebsite(website);
    const publicSources = await gatherPublicResearch(body.query, website, body.apiKeys?.serper);
    const report = await analyzeCompany({
      query: body.query,
      website,
      model: body.model,
      apiKey: body.apiKeys?.openrouter,
      crawledPages,
      publicSources
    });

    const pdf = await createReportPdf(report);
    const discord = await sendDiscordReport(body.discord ?? {}, report, pdf);

    return NextResponse.json({
      report,
      pdfBase64: pdf.toString("base64"),
      discord
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected research failure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
