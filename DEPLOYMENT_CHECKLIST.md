# WaveDigger Deployment Checklist

## Pre-Deployment
- [ ] Test app locally with `npm run dev`
- [ ] Run build to check for errors: `npm run build`
- [ ] Verify app works without Mapbox token (falls back to CARTO maps)
- [ ] Commit all changes to GitHub

## Vercel Setup
- [ ] Sign up/login at vercel.com
- [ ] Import GitHub repository
- [ ] Add environment variables (if using Mapbox):
  - `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] Deploy project

## Custom Domain Setup
- [ ] Add `wavedigger.networksurvey.app` in Vercel domains
- [ ] Update DNS records at domain provider:
  - CNAME: `wavedigger` → `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Verify HTTPS certificate is issued

## Post-Deployment
- [ ] Test live site at custom domain
- [ ] Test BSSID search functionality
- [ ] Verify map loads correctly
- [ ] Check light/dark theme toggle
- [ ] Test on mobile devices
- [ ] Monitor Vercel dashboard for any errors

## Ongoing Maintenance
- [ ] Monitor bandwidth usage (100GB free limit)
- [ ] Check function execution logs
- [ ] Keep dependencies updated
- [ ] Review and respond to any security alerts