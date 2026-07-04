'use client';

import { memo } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { AnalyticsEvents } from '@/lib/analytics';
import { networkSurveyUrl, caskfiveUrl } from '@/lib/external-links';

type Placement = 'about' | 'sidebar' | 'mobile_sheet';

interface DeveloperLinksProps {
  placement: Placement;
  variant?: 'full' | 'compact';
}

/**
 * Outbound links to Network Survey (primary) and Caskfive (a smaller "Built by" credit).
 * Fires the existing external_link_click analytics event on click; the href already
 * carries UTM tags (see lib/external-links.ts) for destination-side attribution.
 */
function DeveloperLinks({ placement, variant = 'compact' }: DeveloperLinksProps) {
  const { logEvent } = useAnalytics();

  const networkSurveyHref = networkSurveyUrl(placement);
  const caskfiveHref = caskfiveUrl(placement);

  const trackNetworkSurvey = () => {
    logEvent(AnalyticsEvents.EXTERNAL_LINK_CLICK, {
      link_type: 'network_survey_app',
      link_url: networkSurveyHref,
    });
  };

  const trackCaskfive = () => {
    logEvent(AnalyticsEvents.EXTERNAL_LINK_CLICK, {
      link_type: 'caskfive_website',
      link_url: caskfiveHref,
    });
  };

  if (variant === 'full') {
    return (
      <p>
        <a
          href={networkSurveyHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackNetworkSurvey}
          className="underline hover:opacity-80"
          style={{ color: 'var(--color-link)' }}
        >
          Network Survey
        </a>{' '}
        is an Android app for capturing cellular, Wi-Fi, Bluetooth, and GNSS survey data.
        WaveDigger is built by{' '}
        <a
          href={caskfiveHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackCaskfive}
          className="underline hover:opacity-80"
          style={{ color: 'var(--color-link)' }}
        >
          Caskfive
        </a>.
      </p>
    );
  }

  return (
    <div className="text-center">
      <a
        href={networkSurveyHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackNetworkSurvey}
        className="text-sm font-medium underline hover:opacity-80"
        style={{ color: 'var(--color-link)' }}
      >
        Try Network Survey
      </a>
      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
        Turn your Android phone into a wireless signal survey tool
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
        Built by{' '}
        <a
          href={caskfiveHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackCaskfive}
          className="underline hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Caskfive
        </a>
      </p>
    </div>
  );
}

// Props are static string literals at every call site, so memoize to avoid re-rendering
// this subtree in hot paths (e.g. the mobile sheet re-renders on every drag frame).
export default memo(DeveloperLinks);
