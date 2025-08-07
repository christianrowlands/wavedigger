import { Metadata } from 'next';
import { formatBSSIDForDisplay } from './bssid-utils';

interface GenerateMetadataParams {
  bssid?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  mode?: string | null;
}

export function generateDynamicMetadata(params: GenerateMetadataParams): Metadata {
  const baseUrl = 'https://wavedigger.networksurvey.app';
  
  if (params.bssid) {
    const formattedBSSID = formatBSSIDForDisplay(params.bssid);
    const title = `${formattedBSSID} Location`;
    const description = `View the location of WiFi access point ${formattedBSSID}${
      params.latitude && params.longitude 
        ? ` at ${parseFloat(params.latitude).toFixed(4)}, ${parseFloat(params.longitude).toFixed(4)}` 
        : ''
    }. Discovered using WaveDigger BSSID lookup tool.`;
    
    return {
      title,
      description,
      openGraph: {
        title: `${formattedBSSID} - WaveDigger`,
        description,
        url: `${baseUrl}/?bssid=${params.bssid}`,
        siteName: 'WaveDigger',
        type: 'website',
        images: [
          {
            url: '/og-image.png',
            width: 1200,
            height: 630,
            alt: `Location of WiFi access point ${formattedBSSID}`,
          }
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${formattedBSSID} - WaveDigger`,
        description: `WiFi access point location: ${formattedBSSID}`,
        images: ['/twitter-image.png'],
      },
      robots: {
        index: false, // Don't index individual BSSID pages for privacy
        follow: true,
      },
    };
  }
  
  // Default metadata for non-BSSID pages
  return {
    title: 'WaveDigger - WiFi & Cell Tower Locator',
    description: 'Find the physical location of WiFi access points and LTE cell towers. Locate networks using BSSID (MAC address) or cell tower IDs (MCC, MNC, TAC, Cell ID). Free network mapping tool using Apple location services.',
  };
}

// This function can be used in a server component when we refactor
export async function generateMetadata({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }): Promise<Metadata> {
  const bssid = typeof searchParams.bssid === 'string' ? searchParams.bssid : null;
  const lat = typeof searchParams.lat === 'string' ? searchParams.lat : null;
  const lng = typeof searchParams.lng === 'string' ? searchParams.lng : null;
  const mode = typeof searchParams.mode === 'string' ? searchParams.mode : null;
  
  return generateDynamicMetadata({ bssid, latitude: lat, longitude: lng, mode });
}