// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://remokey.app',
  // The dev toolbar overlays the page and lands in every screenshot taken
  // during visual review. Nothing here depends on it.
  devToolbar: { enabled: false },

  // No `base`: this deploys to an apex custom domain, not a /repo-name path.
  // Setting one here would prefix every asset URL and break the site.
});
