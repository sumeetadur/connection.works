import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import {
  getTokenById,
  getOrCreateProjectSecret,
  isExpired,
  isRevoked,
  recordTokenUse,
  tokenAllowsProject,
} from '../../../server/codeAccessStore'
import { verifyCodeAccessToken } from '../../../server/codeAccessToken'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const token = typeof (body as any)?.token === 'string' ? (body as any).token : ''
  const projectSlug =
    typeof (body as any)?.projectSlug === 'string' ? (body as any).projectSlug : ''

  if (!token || !projectSlug) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  let tokenId: string
  try {
    const verified = await verifyCodeAccessToken(token)
    tokenId = verified.tokenId
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid access token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const record = await getTokenById(tokenId)
  if (!record) {
    return new Response(JSON.stringify({ error: 'Invalid access token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  if (isRevoked(record)) {
    return new Response(JSON.stringify({ error: 'This access link has been revoked' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  if (isExpired(record.expiresAt)) {
    return new Response(JSON.stringify({ error: 'This access link has expired', expiredAt: record.expiresAt }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const scope = tokenAllowsProject(record, projectSlug)
  if (!scope) {
    return new Response(JSON.stringify({ error: 'This access link is not valid for this page' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const projectSecret = await getOrCreateProjectSecret(projectSlug)

  const projects = await getCollection('projects')
  const entry = projects.find((p) => p.slug === projectSlug)
  if (!entry?.data?.codeAccess?.samples?.length) {
    return new Response(JSON.stringify({ error: 'No code samples available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await recordTokenUse({ tokenId: record.id, projectSlug })

  return new Response(
    JSON.stringify({
      tokenId: record.id,
      expiresAt: record.expiresAt,
      secret: projectSecret,
      allowedSampleIds: scope.sampleIds,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}
