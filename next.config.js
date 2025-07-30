/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile mapbox-gl for Next.js compatibility
  transpilePackages: ['mapbox-gl'],
  
  // Experimental features for better map performance
  experimental: {
    optimizePackageImports: ['mapbox-gl', 'react-map-gl', '@deck.gl/react']
  }
};

module.exports = nextConfig;