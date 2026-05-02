import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetaBuddy — AI-Powered Meta Ads Creation",
  description: "From idea to live Facebook & Instagram campaigns — fully automated. Create, launch and optimize Meta ads with AI in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400;1,500;1,600&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
