import { generateKeyPairSync } from 'node:crypto'

type KeyPairStore = {
  privateJwk: JsonWebKey
  publicJwk: JsonWebKey
  createdAt: string
}

const ENV_KEY_PUBLIC = 'CODE_ACCESS_PUBLIC_KEY'
const ENV_KEY_PRIVATE = 'CODE_ACCESS_PRIVATE_KEY'
const ENV_KEY_CREATED = 'CODE_ACCESS_KEY_CREATED'

function encodeKey(jwk: JsonWebKey): string {
  return Buffer.from(JSON.stringify(jwk)).toString('base64')
}

function decodeKey(encoded: string): JsonWebKey {
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
}

function readFromEnv(): KeyPairStore | null {
  const publicB64 = process.env[ENV_KEY_PUBLIC]
  const privateB64 = process.env[ENV_KEY_PRIVATE]
  const createdAt = process.env[ENV_KEY_CREATED]

  if (!publicB64 || !privateB64 || !createdAt) return null

  try {
    return {
      publicJwk: decodeKey(publicB64),
      privateJwk: decodeKey(privateB64),
      createdAt,
    }
  } catch {
    return null
  }
}

function generateNewKeyPair(): KeyPairStore {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })

  const privateJwk = privateKey.export({ format: 'jwk' }) as JsonWebKey
  const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey

  return {
    privateJwk,
    publicJwk,
    createdAt: new Date().toISOString(),
  }
}

export async function getOrCreateCodeAccessKeyPair(): Promise<KeyPairStore> {
  // Try to read from environment variables first
  const existing = readFromEnv()
  if (existing) return existing

  // Generate new keypair - in production, this should be saved to env vars
  // For Netlify, you'll need to set these via the Netlify UI or CLI:
  // netlify env:set CODE_ACCESS_PRIVATE_KEY "$(base64 -i <(echo '{...}'))"
  // netlify env:set CODE_ACCESS_PUBLIC_KEY "$(base64 -i <(echo '{...}'))"
  // netlify env:set CODE_ACCESS_KEY_CREATED "2024-..."
  const created = generateNewKeyPair()

  // Log instructions for setting env vars (only in build/startup)
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_LOCAL) {
    // In dev mode without env vars, we generate each time (tokens won't persist)
    // This is fine for development testing
    console.warn(
      '[codeAccessKeyPair] No CODE_ACCESS_PRIVATE_KEY/PUBLIC_KEY env vars set. ' +
      'Generating new keypair. For production, set these env vars in Netlify.'
    )
  }

  return created
}
