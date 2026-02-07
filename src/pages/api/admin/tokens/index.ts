import type { APIRoute } from 'astro'
import {
  createToken,
  listTokens,
  isExpired,
  isRevoked,
} from '../../../../server/codeAccessStore'
import { signCodeAccessToken } from '../../../../server/codeAccessToken'

export const prerender = false

export const GET: APIRoute = async () => {
  const tokens = await listTokens()

  return new Response(
    JSON.stringify({
      tokens: tokens.map((t) => ({
        ...t,
        status: isRevoked(t) ? 'revoked' : isExpired(t.expiresAt) ? 'expired' : 'active',
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

export const POST: APIRoute = async ({ request }) => {
  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : ''
  const label = typeof body?.label === 'string' ? body.label : undefined
  const scopes = Array.isArray(body?.scopes) ? body.scopes : []

  if (!expiresAt || scopes.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const token = await createToken({ label, expiresAt, scopes })
  const signedToken = await signCodeAccessToken({ tokenId: token.id })

  return new Response(
    JSON.stringify({
      token,
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
