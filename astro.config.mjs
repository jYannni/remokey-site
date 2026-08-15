// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://remokey.app',
  // No `base`: this deploys to an apex custom domain, not a /repo-name path.
  // Setting one here would prefix every asset URL and break the site.
});
