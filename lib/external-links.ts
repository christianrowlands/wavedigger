// Canonical outbound links from WaveDigger to sister products.
//
// Every URL is tagged with UTM parameters so the destination sites' own analytics
// attribute the visit to WaveDigger. This matters because WaveDigger is served at
// wavedigger.networksurvey.app (a subdomain of networksurvey.app): without explicit
// UTM tags, Google Analytics tends to treat the traffic as a self-referral and fold it
// into (direct)/none. An explicit utm_source overrides that.
//
// URLs are centralized here (never hand-written at call sites) because our links use
// rel="noopener noreferrer", which strips the Referer header and makes the UTM tags the
// only attribution signal.

// placement is one of 'about' | 'sidebar' | 'mobile_sheet' and is passed through as
// utm_content so destination analytics can break clicks down by where they came from.
function withUtm(base: string, placement: string): string {
  const params = new URLSearchParams({
    utm_source: 'wavedigger',
    utm_medium: 'referral',
    utm_campaign: 'wavedigger_app',
    utm_content: placement,
  });
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
}

// Canonical hosts (match the destination's non-redirecting URL so the query string
// is not dropped by a redirect).
export const NETWORK_SURVEY_BASE = 'https://www.networksurvey.app/';
export const CASKFIVE_BASE = 'https://caskfive.com/';

export const networkSurveyUrl = (placement: string) => withUtm(NETWORK_SURVEY_BASE, placement);
export const caskfiveUrl = (placement: string) => withUtm(CASKFIVE_BASE, placement);
