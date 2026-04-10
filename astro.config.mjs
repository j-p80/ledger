import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://heirly.app',
  output: 'static',
  integrations: [
    tailwind(),
  ],
});
