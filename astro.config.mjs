import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

// https://astro.build/config
export default defineConfig({
  site: 'https://connection.works',
  integrations: [react(), tailwind()],
  adapter: node({ mode: 'standalone' }),
})
