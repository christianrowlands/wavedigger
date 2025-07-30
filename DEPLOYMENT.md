# Deploying WaveDigger to Vercel

This guide walks you through deploying WaveDigger to Vercel with a custom domain.

## Prerequisites

- GitHub account with the WaveDigger repository
- Vercel account (free at [vercel.com](https://vercel.com))
- Access to your domain's DNS settings (networksurvey.app)

## Step 1: Import to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js and configure build settings

## Step 2: Configure Environment Variables (Optional)

In your Vercel project settings, go to "Environment Variables" and add:

- `NEXT_PUBLIC_MAPBOX_TOKEN` - Your Mapbox token for enhanced maps (optional)
- `ENABLE_CHINA_API` - Set to "true" to enable China API endpoint (optional)

## Step 3: Deploy

Click "Deploy" - Vercel will build and deploy your app automatically.

## Step 4: Add Custom Domain

1. Go to your project's Settings → Domains
2. Add `wavedigger.networksurvey.app`
3. Update your DNS records:

### Option A: CNAME Record (Recommended)
```
Type: CNAME
Name: wavedigger
Value: cname.vercel-dns.com
```

### Option B: A Records
```
Type: A
Name: wavedigger
Value: 76.76.21.21
```

## Deployment Complete! 🎉

Your app will be available at:
- `https://wavedigger.networksurvey.app` (custom domain)
- `https://your-project.vercel.app` (Vercel subdomain)

## Automatic Deployments

Every push to your main branch will trigger an automatic deployment.

## Monitoring

- View deployment logs in the Vercel dashboard
- Check function logs for API debugging
- Monitor usage against free tier limits (100GB bandwidth/month)