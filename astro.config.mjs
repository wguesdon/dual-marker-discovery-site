import { defineConfig } from 'astro/config';

// The showcase site for dual-marker-discovery.
// Built with Claude: Life Sciences, Research track, 2026.
//
// In production a single App Runner service serves this static site AND the gated app from one
// origin, so the embedded "Ask the data" page (/app) shares cookies with the site as first-party.
// In local dev this Astro server proxies /app and the API to the FastAPI app (port 8080) so the
// same-origin layout is reproduced while iterating on site content.
const AGENT = process.env.AGENT_ORIGIN || 'http://localhost:8080';

export default defineConfig({
  site: 'https://dual-marker-discovery.netlify.app',
  vite: {
    server: {
      proxy: {
        '/app': AGENT,
        '/api': AGENT,
        '/login': AGENT,
        '/healthz': AGENT,
      },
    },
  },
});
