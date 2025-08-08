import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ToastProvider } from "@/components/toast-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | WaveDigger - WiFi & Cell Tower Locator',
    default: 'WaveDigger - WiFi & Cell Tower Locator',
  },
  description: 'Find the physical location of WiFi access points and LTE cell towers. Locate networks using BSSID (MAC address) or cell tower IDs (MCC, MNC, TAC, Cell ID). View EARFCN and PCI values for LTE towers. Free network mapping tool using Apple location services.',
  keywords: [
    'BSSID lookup',
    'WiFi location finder',
    'cell tower locator',
    'LTE tower location',
    'MAC address locator',
    'MCC MNC lookup',
    'TAC Cell ID finder',
    'cellular network mapping',
    'wireless network mapping',
    'access point location',
    'WiFi geolocation',
    'cell tower tracking',
    'BSSID to location',
    'WiFi map',
    'network discovery tool',
    'wireless hotspot finder',
    'mobile network locator',
    'base station finder',
    'network location services',
    'EARFCN lookup',
    'PCI cell tower',
    'LTE frequency',
    'Physical Cell ID',
    'E-UTRA frequency channel'
  ],
  authors: [{ name: 'WaveDigger Team' }],
  creator: 'WaveDigger',
  publisher: 'WaveDigger',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://wavedigger.networksurvey.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'WaveDigger - WiFi & Cell Tower Locator',
    description: 'Locate WiFi access points by BSSID and LTE cell towers by network IDs. Map wireless and cellular networks using Apple location services.',
    url: 'https://wavedigger.networksurvey.app',
    siteName: 'WaveDigger',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WaveDigger - WiFi & Cell Tower Locator',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WaveDigger - WiFi & Cell Tower Locator',
    description: 'Find WiFi access points and LTE cell tower locations. Free network mapping tool.',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WaveDigger',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
      { url: '/apple-icon-180.png', sizes: '180x180' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://wavedigger.networksurvey.app/#webapp",
        "name": "WaveDigger",
        "description": "WiFi and cell tower location finder. Discover the physical location of wireless access points using BSSID (MAC addresses) and LTE cell towers using network IDs (MCC, MNC, TAC, Cell ID). View EARFCN and PCI values for advanced LTE tower analysis.",
        "url": "https://wavedigger.networksurvey.app",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web",
        "browserRequirements": "Requires JavaScript. Works on modern browsers.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "featureList": [
          "BSSID to location lookup",
          "Multiple BSSID search",
          "LTE cell tower location finder",
          "Location-based WiFi discovery",
          "Include surrounding access points",
          "Interactive map visualization",
          "Search history tracking",
          "Share location URLs"
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://wavedigger.networksurvey.app/#organization",
        "name": "WaveDigger",
        "url": "https://wavedigger.networksurvey.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://wavedigger.networksurvey.app/logo.png"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://wavedigger.networksurvey.app/#website",
        "url": "https://wavedigger.networksurvey.app",
        "name": "WaveDigger",
        "description": "WiFi and cell tower location finder and network mapping tool",
        "publisher": {
          "@id": "https://wavedigger.networksurvey.app/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://wavedigger.networksurvey.app/?bssid={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
          strategy="beforeInteractive"
        />
        <ToastProvider>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
