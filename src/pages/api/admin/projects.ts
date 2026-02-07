import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

export const prerender = false

export const GET: APIRoute = async () => {
  const projects = await getCollection('projects')

  return new Response(
    JSON.stringify({
      projects: projects.map((p) => ({
        slug: p.slug,
        title: p.data.title,
        samples:
          p.data.codeAccess?.samples?.map((s) => ({
            id: s.id,
            title: s.title,
            language: s.language,
          })) ?? [],
      })),
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}
