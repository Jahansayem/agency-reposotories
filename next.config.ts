import type { NextConfig } from "next";
import withPWA from 'next-pwa';

// NOTE: Outlook CORS origins are now managed dynamically in middleware.ts
// and src/lib/outlookAuth.ts to avoid the comma-separated origin issue.
// See Issue #38: Access-Control-Allow-Origin must be a single origin, not a list.

// Content Security Policy
// Note: Next.js requires 'unsafe-inline' for styles due to how Tailwind/CSS-in-JS works
// 'unsafe-eval' is removed in production for security
const isProduction = process.env.NODE_ENV === 'production';

const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  // In production, we try to avoid unsafe-eval
  // unsafe-inline is still needed for Next.js hydration scripts
  "script-src": isProduction
    ? ["'self'", "'unsafe-inline'"] // No unsafe-eval in production
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Dev needs eval for hot reload
  "style-src": ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
  "img-src": ["'self'", "data:", "https:", "blob:"],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'", "data:", "blob:"], // Allow audio/video from data URLs and blobs
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.anthropic.com",
    "https://api.openai.com",
    // Sentry for error reporting
    "https://*.sentry.io",
  ],
  "frame-ancestors": ["'none'"], // Clickjacking protection
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"], // Prevent plugins like Flash
  "worker-src": ["'self'", "blob:"], // Service workers
  "child-src": ["'self'", "blob:"], // iframes and workers
  "manifest-src": ["'self'"], // Web app manifest
  // Only enforce HTTPS upgrade in production (dev uses http://localhost)
  ...(isProduction ? { "upgrade-insecure-requests": [] } : {}),
  // Report CSP violations for monitoring
  "report-uri": ["/api/csp-report"],
};

const cspString = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(" ")}`.trim())
  .join("; ");

const baseConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  turbopack: {},
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@dnd-kit/core', '@dnd-kit/sortable'],
  },
  // Issue #30: Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Webpack configuration for better code splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework bundle (React, Next.js)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Animation libraries
            animations: {
              name: 'animations',
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              priority: 35,
              reuseExistingChunk: true,
            },
            // DnD Kit
            dndkit: {
              name: 'dndkit',
              test: /[\\/]node_modules[\\/](@dnd-kit)[\\/]/,
              priority: 35,
              reuseExistingChunk: true,
            },
            // Lucide icons
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // Other vendor libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module: any) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return packageName ? `npm.${packageName.replace('@', '')}` : 'npm';
              },
              priority: 20,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common components used across multiple pages
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // Global security headers for all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspString,
          },
        ],
      },
      {
        // Allow Office.js to load Outlook add-in files
        // NOTE: Access-Control-Allow-Origin is set dynamically in middleware.ts
        // to return only the single matching origin (not a comma-separated list).
        source: "/outlook/:path*",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Vary", value: "Origin" },
        ],
      },
      {
        // CORS headers for Outlook API endpoints - restricted to Office domains
        // NOTE: Access-Control-Allow-Origin is set dynamically in middleware.ts
        // to return only the single matching origin (not a comma-separated list).
        source: "/api/outlook/:path*",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, X-API-Key, X-CSRF-Token" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

// Issue #34: Service Worker Implementation - PWA Configuration
export default withPWA({
  dest: 'public',
  // Disable in development to avoid service worker caching issues
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Runtime caching strategies for network requests
  runtimeCaching: [
    {
      // Cache Supabase API requests with NetworkFirst strategy
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache static assets with CacheFirst strategy
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Cache font files
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      // Cache API routes with NetworkFirst
      urlPattern: /^https?:\/\/localhost:3000\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
      },
    },
  ],
})(baseConfig as any);
