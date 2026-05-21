import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Cora — Warm, AI-guided writing canvas",
  description: "Cora blends the structured efficiency of Notion with the cozy, friendly intelligence of Google NotebookLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} data-theme="dark">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
