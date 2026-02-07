#!/usr/bin/env node
/**
 * Generate keypair for Netlify environment variables
 * Run this locally to generate keys, then set them in Netlify:
 * 
 * netlify env:set CODE_ACCESS_PRIVATE_KEY "$(node scripts/generate-keypair.mjs private)"
 * netlify env:set CODE_ACCESS_PUBLIC_KEY "$(node scripts/generate-keypair.mjs public)"
 * netlify env:set CODE_ACCESS_KEY_CREATED "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
 */

import { generateKeyPairSync } from 'node:crypto'

function generateKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })

  const privateJwk = privateKey.export({ format: 'jwk' })
  const publicJwk = publicKey.export({ format: 'jwk' })

  return {
    private: Buffer.from(JSON.stringify(privateJwk)).toString('base64'),
    public: Buffer.from(JSON.stringify(publicJwk)).toString('base64'),
    createdAt: new Date().toISOString(),
  }
}

const mode = process.argv[2]
const keys = generateKeyPair()

if (mode === 'private') {
  console.log(keys.private)
} else if (mode === 'public') {
  console.log(keys.public)
} else if (mode === 'created') {
  console.log(keys.createdAt)
} else {
  console.log(`
Generated keypair for Netlify environment variables.

Set these in your Netlify site:

netlify env:set CODE_ACCESS_PRIVATE_KEY "${keys.private}"
netlify env:set CODE_ACCESS_PUBLIC_KEY "${keys.public}"  
netlify env:set CODE_ACCESS_KEY_CREATED "${keys.createdAt}"

Or add to netlify.toml:
[template.environment]
  CODE_ACCESS_PRIVATE_KEY = "${keys.private}"
  CODE_ACCESS_PUBLIC_KEY = "${keys.public}"
  CODE_ACCESS_KEY_CREATED = "${keys.createdAt}"

⚠️  IMPORTANT: Keep these values secret! The private key should never be exposed.
`)
}
