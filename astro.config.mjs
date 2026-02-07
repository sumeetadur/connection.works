import { defineConfig } from 'astro/config'
import netlify from '@astrojs/netlify'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

// https://astro.build/config
export default defineConfig({
  site: 'https://connection.works',
  integrations: [react(), tailwind()],
  adapter: netlify(),
})
