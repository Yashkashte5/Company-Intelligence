import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Company Intelligence",
  description: "AI-powered company research, competitor analysis, PDF reports, and Discord automation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
