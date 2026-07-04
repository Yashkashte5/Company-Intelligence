import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResearchReport } from "./types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function ensurePage(state: { doc: PDFDocument; page: PDFPage; y: number }, needed = 80) {
  if (state.y - needed > MARGIN) return;
  state.page = state.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.y = PAGE_HEIGHT - MARGIN;
}

function drawTextBlock(state: { doc: PDFDocument; page: PDFPage; y: number }, text: string, options: {
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  x?: number;
  width?: number;
  lineHeight?: number;
}) {
  const x = options.x ?? MARGIN;
  const width = options.width ?? CONTENT_WIDTH;
  const lineHeight = options.lineHeight ?? options.size + 4;
  const lines = wrapText(text, options.font, options.size, width);

  for (const line of lines) {
    ensurePage(state, lineHeight + 12);
    state.page.drawText(line, {
      x,
      y: state.y,
      size: options.size,
      font: options.font,
      color: options.color ?? rgb(0.08, 0.09, 0.12)
    });
    state.y -= lineHeight;
  }
}

function section(state: { doc: PDFDocument; page: PDFPage; y: number }, title: string, bold: PDFFont) {
  ensurePage(state, 70);
  state.y -= 18;
  state.page.drawText(title, {
    x: MARGIN,
    y: state.y,
    size: 12,
    font: bold,
    color: rgb(0.6, 0.41, 0.04)
  });
  state.y -= 10;
  state.page.drawLine({
    start: { x: MARGIN, y: state.y },
    end: { x: PAGE_WIDTH - MARGIN, y: state.y },
    thickness: 0.6,
    color: rgb(0.86, 0.86, 0.86)
  });
  state.y -= 18;
}

function bullet(state: { doc: PDFDocument; page: PDFPage; y: number }, text: string, font: PDFFont) {
  drawTextBlock(state, `- ${text}`, { font, size: 10, lineHeight: 14 });
  state.y -= 2;
}

export async function createReportPdf(report: ResearchReport) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const state = { doc, page, y: PAGE_HEIGHT - MARGIN };

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 104,
    width: PAGE_WIDTH,
    height: 104,
    color: rgb(0.03, 0.04, 0.06)
  });
  page.drawText("COMPANY INTELLIGENCE - RESEARCH REPORT", {
    x: MARGIN,
    y: PAGE_HEIGHT - 45,
    size: 11,
    font: bold,
    color: rgb(0.95, 0.74, 0.29)
  });
  page.drawText(report.companyName.slice(0, 42), {
    x: MARGIN,
    y: PAGE_HEIGHT - 76,
    size: 25,
    font: bold,
    color: rgb(1, 1, 1)
  });
  page.drawLine({
    start: { x: 0, y: PAGE_HEIGHT - 104 },
    end: { x: PAGE_WIDTH, y: PAGE_HEIGHT - 104 },
    thickness: 3,
    color: rgb(0.95, 0.74, 0.29)
  });
  state.y = PAGE_HEIGHT - 136;

  section(state, "COMPANY INFORMATION", bold);
  const rows = [
    ["Website", report.website],
    ["Phone", report.phone],
    ["Address", report.address]
  ];
  for (const [label, value] of rows) {
    ensurePage(state, 34);
    state.page.drawText(label, { x: MARGIN, y: state.y, size: 10, font: bold, color: rgb(0.08, 0.09, 0.12) });
    drawTextBlock(state, value, { x: MARGIN + 100, width: CONTENT_WIDTH - 100, font: regular, size: 10, lineHeight: 14 });
    state.y -= 4;
  }

  section(state, "COMPANY SUMMARY", bold);
  drawTextBlock(state, report.summary, { font: regular, size: 10, lineHeight: 14 });

  section(state, "PRODUCTS & SERVICES", bold);
  report.productsServices.forEach((item) => bullet(state, item, regular));

  section(state, "AI-GENERATED PAIN POINTS", bold);
  report.painPoints.forEach((item) => bullet(state, item, regular));

  section(state, "COMPETITORS", bold);
  for (const competitor of report.competitors) {
    ensurePage(state, 60);
    drawTextBlock(state, competitor.name, { font: bold, size: 10, lineHeight: 14 });
    drawTextBlock(state, competitor.website, { font: regular, size: 10, lineHeight: 14, color: rgb(0.22, 0.33, 0.72) });
    if (competitor.reason) drawTextBlock(state, competitor.reason, { font: regular, size: 9, lineHeight: 13, color: rgb(0.32, 0.36, 0.43) });
    state.y -= 6;
  }

  if (report.sources.length) {
    section(state, "CRAWLED SOURCES", bold);
    report.sources.slice(0, 6).forEach((source) => bullet(state, `${source.title}: ${source.url}`, regular));
  }

  for (const pdfPage of doc.getPages()) {
    pdfPage.drawText(`Generated ${new Date(report.generatedAt).toLocaleString()}`, {
      x: MARGIN,
      y: 32,
      size: 8,
      font: regular,
      color: rgb(0.48, 0.5, 0.54)
    });
  }

  return Buffer.from(await doc.save());
}
