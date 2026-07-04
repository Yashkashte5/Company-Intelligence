"use client";

import { AlertCircle, CheckCircle2, Download, Eye, EyeOff, FileSearch, Plus, Send, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { DiscordConfig, ResearchReport } from "@/lib/types";

type ApiResponse = {
  report: ResearchReport;
  pdfBase64: string;
  discord: { sent: boolean; reason?: string };
  error?: string;
};

const models = [
  { label: "Claude Sonnet 4.5", value: "anthropic/claude-sonnet-4.5" },
  { label: "GPT-4.1", value: "openai/gpt-4.1" },
  { label: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro" },
  { label: "DeepSeek V3", value: "deepseek/deepseek-chat" }
];

const suggestions = ["notion.so", "Figma", "Linear", "Vercel"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"api" | "discord">("api");
  const [query, setQuery] = useState("");
  const [model, setModel] = useState(models[0].value);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [discordStatus, setDiscordStatus] = useState("");
  const [discord, setDiscord] = useState<DiscordConfig>({});
  const [apiKeys, setApiKeys] = useState({ serper: "", openrouter: "" });
  const [showKeys, setShowKeys] = useState(false);

  const canResearch = query.trim().length > 1 && !loading;
  const hasApiKeys = Boolean(apiKeys.serper && apiKeys.openrouter);

  const pdfName = useMemo(() => {
    const name = report?.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "company";
    return `${name}-research-report.pdf`;
  }, [report]);

  function updateDiscord(key: keyof DiscordConfig, value: string) {
    setDiscord((current) => ({ ...current, [key]: value }));
  }

  function updateApiKey(key: "serper" | "openrouter", value: string) {
    setApiKeys((current) => ({ ...current, [key]: value }));
  }

  function downloadPdf() {
    if (!pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = pdfName;
    link.click();
  }

  async function submitResearch(event?: FormEvent) {
    event?.preventDefault();
    if (!canResearch) return;
    setLoading(true);
    setError("");
    setDiscordStatus("");
    setReport(null);
    setPdfBase64("");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), model, apiKeys, discord })
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error || "Research failed.");
      setReport(data.report);
      setPdfBase64(data.pdfBase64);
      setDiscordStatus(data.discord.sent ? "Sent to Discord" : data.discord.reason || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><FileSearch size={24} /></div>
          <div>
            <h1>Company Intelligence</h1>
            <p>Research Assistant</p>
          </div>
        </div>

        <button className="new-button" onClick={() => { setReport(null); setQuery(""); setError(""); }}>
          <Plus size={16} /> New Research
        </button>

        <div className="tabs" role="tablist">
          <button className={activeTab === "api" ? "active" : ""} onClick={() => setActiveTab("api")}>API</button>
          <button className={activeTab === "discord" ? "active" : ""} onClick={() => setActiveTab("discord")}>Discord</button>
        </div>

        {activeTab === "api" ? (
          <section className="panel">
            <div className="key-header">
              <div>
                <strong>API Configuration</strong>
                <p>Keys stay hidden in this session and are sent only when you run research.</p>
              </div>
              <button type="button" onClick={() => setShowKeys((value) => !value)} aria-label={showKeys ? "Hide API keys" : "Show API keys"}>
                {showKeys ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label>
              <span>OpenRouter API Key</span>
              <input
                type={showKeys ? "text" : "password"}
                value={apiKeys.openrouter}
                onChange={(event) => updateApiKey("openrouter", event.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
              />
            </label>
            <label>
              <span>Serper.dev API Key</span>
              <input
                type={showKeys ? "text" : "password"}
                value={apiKeys.serper}
                onChange={(event) => updateApiKey("serper", event.target.value)}
                placeholder="Your Serper key..."
                autoComplete="off"
              />
            </label>
            <label>
              <span>AI Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </section>
        ) : (
          <section className="panel">
            <div className="discord-card">
              <strong>Discord Bot Integration</strong>
              <p>After research completes, the report auto-sends to your configured channel.</p>
            </div>
            <label>
              <span>Bot Token</span>
              <input type="password" value={discord.botToken ?? ""} onChange={(event) => updateDiscord("botToken", event.target.value)} placeholder="Bot token..." />
            </label>
            <label>
              <span>Channel ID</span>
              <input value={discord.channelId ?? ""} onChange={(event) => updateDiscord("channelId", event.target.value)} placeholder="000000000000000000" />
            </label>
            <label>
              <span>Applicant Name</span>
              <input value={discord.applicantName ?? ""} onChange={(event) => updateDiscord("applicantName", event.target.value)} placeholder="Your full name" />
            </label>
            <label>
              <span>Email Address</span>
              <input value={discord.applicantEmail ?? ""} onChange={(event) => updateDiscord("applicantEmail", event.target.value)} placeholder="email@example.com" />
            </label>
          </section>
        )}

        <section className="steps">
          <span>How it works</span>
          <p><b>1</b> Enter a company name or URL</p>
          <p><b>2</b> Serper.dev searches public sources</p>
          <p><b>3</b> Website crawler extracts key pages</p>
          <p><b>4</b> OpenRouter generates the report</p>
        </section>

        <footer>OpenRouter · Serper · jsPDF · Discord</footer>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <strong>Company Research</strong>
          <span className="live"><i /> Live</span>
        </header>

        <div className={report ? "content has-report" : "content"}>
          {!report && !loading && (
            <section className="hero">
              <p className="eyebrow"><Sparkles size={15} /> AI-powered intelligence</p>
              <h2>Know any company<br />in minutes.</h2>
              <p className="subcopy">Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.</p>
              <div className="suggestions">
                {suggestions.map((item) => <button key={item} onClick={() => setQuery(item)}>{item}</button>)}
              </div>
              <div className="hint">{hasApiKeys ? "Ready for research" : "Enter API keys in the sidebar to get started"}</div>
            </section>
          )}

          {loading && (
            <section className="loading-card">
              <div className="spinner" />
              <h2>Researching {query}</h2>
              <p>Resolving the official site, crawling key pages, enriching with Serper, and asking OpenRouter for structured insights.</p>
              <div className="progress"><span /></div>
            </section>
          )}

          {error && (
            <section className="error-card">
              <AlertCircle size={20} />
              <div>
                <strong>Research could not complete</strong>
                <p>{error}</p>
              </div>
            </section>
          )}

          {report && (
            <article className="report-card">
              <div className="report-head">
                <div>
                  <h2>{report.companyName}</h2>
                  <a href={report.website} target="_blank" rel="noreferrer">{report.website}</a>
                </div>
                <span className="complete">Research complete</span>
              </div>

              <div className="info-grid">
                <div><span>Phone</span><strong>{report.phone}</strong></div>
                <div><span>Address</span><strong>{report.address}</strong></div>
              </div>

              <section>
                <h3>Company Summary</h3>
                <p className="summary">{report.summary}</p>
              </section>

              <section>
                <h3>Products & Services</h3>
                <div className="chips">
                  {report.productsServices.map((item) => <span key={item}>{item}</span>)}
                </div>
              </section>

              <section>
                <h3>AI-generated Pain Points</h3>
                <ul>
                  {report.painPoints.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>

              <section>
                <h3>Competitors</h3>
                <div className="competitors">
                  {report.competitors.map((item) => (
                    <div key={`${item.name}-${item.website}`}>
                      <strong>{item.name}</strong>
                      <a href={item.website} target="_blank" rel="noreferrer">{item.website}</a>
                      {item.reason && <p>{item.reason}</p>}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>Crawled Sources</h3>
                <div className="sources">
                  {report.sources.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.title}</a>)}
                </div>
              </section>

              <div className="actions">
                <button className="primary" onClick={downloadPdf}><Download size={18} /> Download PDF Report</button>
                {discordStatus && <span className={discordStatus.startsWith("Sent") ? "sent" : "muted"}><CheckCircle2 size={16} /> {discordStatus}</span>}
              </div>
            </article>
          )}
        </div>

        <form className="composer" onSubmit={submitResearch}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://stripe.com)..." />
          <button type="submit" disabled={!canResearch}><span>Research</span><Send size={17} /></button>
          <small>Enter to research · Shift+Enter for a new line</small>
        </form>
      </section>
    </main>
  );
}
