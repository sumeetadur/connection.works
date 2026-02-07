import type { APIRoute } from 'astro'
import {
  deleteToken,
  getTokenById,
  updateToken,
  isExpired,
  isRevoked,
} from '../../../../server/codeAccessStore'
import { signCodeAccessToken } from '../../../../server/codeAccessToken'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) return new Response('Not found', { status: 404 })

  const token = await getTokenById(id)
  if (!token) return new Response('Not found', { status: 404 })

  const signedToken = await signCodeAccessToken({ tokenId: token.id })

  return new Response(
    JSON.stringify({
      token: {
        ...token,
        status: isRevoked(token) ? 'revoked' : isExpired(token.expiresAt) ? 'expired' : 'active',
      },
      signedToken,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}

export const PATCH: APIRoute = async ({ request, params }) => {
  const id = params.id
  if (!id) return new Response('Not found', { status: 404 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const patch: any = {}
  if (typeof body?.label === 'string') patch.label = body.label
  if (typeof body?.expiresAt === 'string') patch.expiresAt = body.expiresAt
  if (Array.isArray(body?.scopes)) patch.scopes = body.scopes
  if (typeof body?.revokedAt === 'string' || body?.revokedAt === null) {
    patch.revokedAt = body.revokedAt ?? undefined
  }

  const updated = await updateToken(id, patch)
  if (!updated) return new Response('Not found', { status: 404 })

  return new Response(JSON.stringify({ token: updated }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id
  if (!id) return new Response('Not found', { status: 404 })

  const ok = await deleteToken(id)
  return new Response(JSON.stringify({ ok }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
