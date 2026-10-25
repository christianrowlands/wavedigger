import { MetadataRoute } from 'next';

// One page app: the homepage is the only indexable URL. An empty sitemap is
// reported as an error in Search Console.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://wavedigger.networksurvey.app/',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
