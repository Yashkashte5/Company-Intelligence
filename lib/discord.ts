import type { DiscordConfig, ResearchReport } from "./types";

export async function sendDiscordReport(config: DiscordConfig, report: ResearchReport, pdf: Buffer) {
  if (!config.botToken || !config.channelId) return { sent: false, reason: "Discord configuration was not provided." };

  const form = new FormData();
  const payload = {
    content: [
      "**Company Research Report Generated**",
      `Applicant: ${config.applicantName || "Not provided"}`,
      `Email: ${config.applicantEmail || "Not provided"}`,
      `Company: ${report.companyName}`,
      `Website: ${report.website}`
    ].join("\n")
  };

  form.append("payload_json", JSON.stringify(payload));
  const pdfBytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  form.append("files[0]", new Blob([pdfBytes], { type: "application/pdf" }), `${report.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-research-report.pdf`);

  const response = await fetch(`https://discord.com/api/v10/channels/${config.channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${config.botToken}`
    },
    body: form
  });

  if (!response.ok) {
    return { sent: false, reason: `Discord upload failed: ${response.status}` };
  }

  return { sent: true };
}
