import { webcrypto } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64UrlEncodeBytes(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecodeBytes(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return new Uint8Array(Buffer.from(padded, 'base64'))
}

function encodeJsonBase64Url(obj) {
  return base64UrlEncodeBytes(encoder.encode(JSON.stringify(obj)))
}

function decodeJsonBase64Url(str) {
  const bytes = base64UrlDecodeBytes(str)
  return JSON.parse(decoder.decode(bytes))
}

async function importPublicKey(jwk) {
  return webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )
}

async function importPrivateKey(jwk) {
  return webcrypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function signToken(tokenId, privateJwk) {
  const header = { alg: 'ES256', typ: 'CODEACCESS' }
  const payload = { tid: tokenId }

  const headerB64 = encodeJsonBase64Url(header)
  const payloadB64 = encodeJsonBase64Url(payload)
  const toSign = `${headerB64}.${payloadB64}`

  const key = await importPrivateKey(privateJwk)
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(toSign)
  )

  const sigB64 = base64UrlEncodeBytes(new Uint8Array(signature))
  return `${toSign}.${sigB64}`
}

async function verifyToken(token, publicJwk) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const [headerB64, payloadB64, sigB64] = parts

  const header = decodeJsonBase64Url(headerB64)
  if (header?.alg !== 'ES256' || header?.typ !== 'CODEACCESS') {
    throw new Error('Invalid header')
  }

  const payload = decodeJsonBase64Url(payloadB64)
  if (!payload?.tid) throw new Error('Missing tid')

  const key = await importPublicKey(publicJwk)
  const ok = await webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    base64UrlDecodeBytes(sigB64),
    encoder.encode(`${headerB64}.${payloadB64}`)
  )
  if (!ok) throw new Error('Invalid signature')

  return { tokenId: payload.tid }
}

async function main() {
  try {
    const keyData = await readFile('.data/code-access/keypair.json', 'utf8')
    const keys = JSON.parse(keyData)

    const tokenId = 'gIZ8bTU1OnwNjLj6Hck4OphA'

    console.log('Testing token signing/verification...')

    // Sign a token
    const signed = await signToken(tokenId, keys.privateJwk)
    console.log('Signed token:', signed)

    // Verify the token
    const verified = await verifyToken(signed, keys.publicJwk)
    console.log('Verified:', verified)

    // Now test the exchange API
    const res = await fetch('http://localhost:4321/api/code-access/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: signed, projectSlug: 'l8log-web' }),
    })

    const data = await res.json()
    console.log('Exchange response:', res.status, data)
  } catch (err) {
    console.error('Error:', err.message)
  }
}

main()
