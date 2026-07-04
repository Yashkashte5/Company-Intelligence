export type Competitor = {
  name: string;
  website: string;
  reason?: string;
};

export type SourcePage = {
  title: string;
  url: string;
  excerpt: string;
};

export type ResearchReport = {
  companyName: string;
  website: string;
  phone: string;
  address: string;
  summary: string;
  productsServices: string[];
  painPoints: string[];
  competitors: Competitor[];
  sources: SourcePage[];
  generatedAt: string;
};

export type DiscordConfig = {
  botToken?: string;
  channelId?: string;
  applicantName?: string;
  applicantEmail?: string;
};
