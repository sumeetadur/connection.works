import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('Astro site URL is required to generate sitemap.xml')
  }

  const staticPages = ['/', '/about', '/contact', '/portfolio', '/portfolio/media-guidelines']

  const projects = await getCollection('projects')
  const projectUrls = projects.map((p) => `/portfolio/${p.slug}`)

  const allPaths = [...staticPages, ...projectUrls]

  const urlsXml = allPaths
    .map((path) => {
      const loc = new URL(path, site).href
      return `<url><loc>${escapeXml(loc)}</loc></url>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urlsXml +
    `</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
