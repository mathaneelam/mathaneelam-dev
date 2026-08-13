import type { Metadata, Viewport } from "next";
import { DM_Serif_Display } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

/* The ONLY webfont on the site. Body text uses system-ui, which is already on
   the visitor's phone and costs zero bytes to download. */
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  keywords: [
    "AI voice agent India",
    "AI receptionist Tamil",
    "missed call automation",
    "WhatsApp automation India",
    "AI phone answering Tiruppur",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.role}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.role}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets content sit correctly around an iPhone notch
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSerif.variable} antialiased`}>
      <head>
        {/* If JavaScript is switched off, cancel the scroll-reveal start state
            so the page reads normally. Doing it this way rather than adding a
            class to <html> from a script keeps React's hydration happy. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
