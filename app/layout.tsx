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
    template: '%s | WaveDigger - WiFi Location Finder',
    default: 'WaveDigger - BSSID Lookup & WiFi Access Point Locator',
  },
  description: 'Find the physical location of WiFi access points using BSSID (MAC address). Free WiFi network mapping tool using Apple location services for accurate geolocation.',
  keywords: [
    'BSSID lookup',
    'WiFi location finder',
    'MAC address locator',
    'wireless network mapping',
    'access point location',
    'WiFi geolocation',
    'BSSID to location',
    'WiFi map',
    'network discovery tool',
    'wireless hotspot finder',
    'WiFi triangulation',
    'SSID location',
    'router location lookup',
    'WiFi tracking',
    'network location services'
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
    title: 'WaveDigger - WiFi Location Discovery Tool',
    description: 'Locate WiFi access points by BSSID (MAC address). Map wireless networks and discover access point locations using Apple location services.',
    url: 'https://wavedigger.networksurvey.app',
    siteName: 'WaveDigger',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WaveDigger - WiFi Location Finder',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WaveDigger - BSSID Location Finder',
    description: 'Find WiFi access point locations by BSSID. Free network mapping tool.',
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
        "description": "WiFi location finder and BSSID lookup tool. Discover the physical location of wireless access points using MAC addresses.",
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
          "Location-based WiFi discovery",
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
        "description": "WiFi location finder and network mapping tool",
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
