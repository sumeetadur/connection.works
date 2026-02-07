import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { getOrCreateCodeAccessKeyPair } from './codeAccessKeyPair'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64UrlEncodeBytes(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecodeBytes(str: string) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return new Uint8Array(Buffer.from(padded, 'base64'))
}

function encodeJsonBase64Url(obj: unknown) {
  return base64UrlEncodeBytes(encoder.encode(JSON.stringify(obj)))
}

function decodeJsonBase64Url<T>(str: string): T {
  const bytes = base64UrlDecodeBytes(str)
  return JSON.parse(decoder.decode(bytes)) as T
}

type TokenHeader = {
  alg: 'ES256'
  typ: 'CODEACCESS'
}

type TokenPayload = {
  tid: string
}

async function importPrivateKey() {
  const keys = await getOrCreateCodeAccessKeyPair()
  const jwk = keys.privateJwk
  return webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function importPublicKey() {
  const keys = await getOrCreateCodeAccessKeyPair()
  const jwk = keys.publicJwk
  return webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
}

export async function signCodeAccessToken(input: { tokenId: string }) {
  const header: TokenHeader = { alg: 'ES256', typ: 'CODEACCESS' }
  const payload: TokenPayload = { tid: input.tokenId }

  const headerB64 = encodeJsonBase64Url(header)
  const payloadB64 = encodeJsonBase64Url(payload)
  const toSign = `${headerB64}.${payloadB64}`

  const key = await importPrivateKey()
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(toSign)
  )

  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signature))
  return `${toSign}.${sigB64}`
}

export async function verifyCodeAccessToken(token: string): Promise<{ tokenId: string }> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid access token')
  const [headerB64, payloadB64, sigB64] = parts

  const header = decodeJsonBase64Url<TokenHeader>(headerB64)
  if (header?.alg !== 'ES256' || header?.typ !== 'CODEACCESS') {
    throw new Error('Invalid access token')
  }

  const payload = decodeJsonBase64Url<TokenPayload>(payloadB64)
  if (!payload?.tid) throw new Error('Invalid access token')

  const key = await importPublicKey()
  const ok = await webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    base64UrlDecodeBytes(sigB64),
    encoder.encode(`${headerB64}.${payloadB64}`)
  )
  if (!ok) throw new Error('Invalid access token')

  return { tokenId: payload.tid }
}
