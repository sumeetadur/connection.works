import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  randomBytes,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  webcrypto,
} from 'node:crypto'

const encoder = new TextEncoder()

function base64UrlEncodeBytes(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlEncodeString(str) {
  return base64UrlEncodeBytes(encoder.encode(str))
}

function parseArgs(argv) {
  const args = {}
  const samples = []

  for (let i = 0; i < argv.length; i += 1) {
    const v = argv[i]
    if (!v.startsWith('--')) continue

    const key = v.slice(2)
    const next = argv[i + 1]

    if (key === 'sample') {
      if (!next || next.startsWith('--')) throw new Error('Missing value for --sample')
      samples.push(next)
      i += 1
      continue
    }

    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    i += 1
  }

  return { args, samples }
}

function parseDurationToMs(input) {
  if (!input) return 24 * 60 * 60 * 1000
  const m = /^([0-9]+)\s*(ms|s|m|h|d)$/.exec(input)
  if (!m) throw new Error('Invalid duration, expected e.g. 15m, 6h, 2d')
  const n = Number(m[1])
  const unit = m[2]
  const mult =
    unit === 'ms'
      ? 1
      : unit === 's'
        ? 1000
        : unit === 'm'
          ? 60 * 1000
          : unit === 'h'
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000
  return n * mult
}

function guessLanguage(filePath) {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.ts')) return 'ts'
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.js')) return 'js'
  if (lower.endsWith('.jsx')) return 'jsx'
  if (lower.endsWith('.mjs')) return 'js'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.md')) return 'md'
  return 'txt'
}

function titleFromPath(filePath) {
  const parts = filePath.split('/').filter(Boolean)
  const file = parts[parts.length - 1] ?? filePath
  return file.replace(/\.[^.]+$/, '')
}

async function codeToHtmlSafe(code, language) {
  try {
    const shiki = await import('shiki')
    if (typeof shiki.codeToHtml === 'function') {
      return shiki.codeToHtml(code, {
        lang: language,
        theme: 'github-dark',
      })
    }
  } catch {
    // fall through
  }

  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return `<pre><code class="language-${language}">${escaped}</code></pre>`
}

async function deriveAesKey({ secret, saltBytes, iterations }) {
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
}

async function encryptUtf8({ key, ivBytes, plaintext }) {
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encoder.encode(plaintext)
  )
  return new Uint8Array(ciphertext)
}

function resolveStorePath() {
  return join(process.cwd(), '.data', 'code-access', 'tokens.json')
}

async function readStore() {
  const filePath = resolveStorePath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { tokens: [], projects: {} }
    if (!parsed.projects || typeof parsed.projects !== 'object') {
      return { ...(parsed ?? {}), projects: {} }
    }
    if (!Array.isArray(parsed.tokens)) {
      return { ...(parsed ?? {}), tokens: [], projects: parsed.projects }
    }
    return parsed
  } catch {
    return { tokens: [], projects: {} }
  }
}

async function writeStore(data) {
  const filePath = resolveStorePath()
  await mkdir(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  await rename(tmpPath, filePath)
}

async function getOrCreateProjectSecret(projectSlug) {
  const store = await readStore()
  const existing = store.projects?.[projectSlug]
  if (existing?.secret) return existing.secret

  const now = new Date().toISOString()
  const created = {
    projectSlug,
    secret: base64UrlEncodeBytes(randomBytes(32)),
    createdAt: now,
  }

  store.projects = store.projects && typeof store.projects === 'object' ? store.projects : {}
  store.projects[projectSlug] = created
  store.tokens = Array.isArray(store.tokens) ? store.tokens : []
  await writeStore(store)
  return created.secret
}

async function writeJsonOut(outPath, data) {
  const resolved = join(process.cwd(), outPath)
  await mkdir(dirname(resolved), { recursive: true })
  const tmpPath = `${resolved}.tmp`
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  await rename(tmpPath, resolved)
}

function ensureKeyPair({ privateKeyJwkRaw }) {
  if (privateKeyJwkRaw) {
    const privateJwk = JSON.parse(privateKeyJwkRaw)
    const privateKey = createPrivateKey({ key: privateJwk, format: 'jwk' })
    const publicKey = createPublicKey(privateKey)
    const publicJwk = publicKey.export({ format: 'jwk' })
    return { privateJwk, publicJwk }
  }

  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })

  const privateJwk = privateKey.export({ format: 'jwk' })
  const publicJwk = publicKey.export({ format: 'jwk' })

  return { privateJwk, publicJwk }
}

async function signEs256({ privateJwk, data }) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    data
  )

  return new Uint8Array(signature)
}

async function main() {
  const { args, samples } = parseArgs(process.argv.slice(2))

  const project = args.project
  if (!project || typeof project !== 'string') {
    throw new Error('Missing --project <project-slug>')
  }

  if (samples.length === 0) {
    throw new Error('Provide at least one --sample <path>')
  }

  const expiresInMs = parseDurationToMs(args['expires-in'])
  const exp = Date.now() + expiresInMs

  const iterations = Number(args.iterations ?? 210000)
  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error('Invalid --iterations')
  }

  const useStoreSecret = Boolean(args['use-store-secret'])
  const out = typeof args.out === 'string' && args.out.trim() ? args.out.trim() : null

  const secret = useStoreSecret
    ? await getOrCreateProjectSecret(project)
    : base64UrlEncodeBytes(randomBytes(32))

  const keypair = useStoreSecret
    ? null
    : ensureKeyPair({
        privateKeyJwkRaw: process.env.CODE_ACCESS_PRIVATE_KEY_JWK,
      })

  const token = useStoreSecret
    ? null
    : (() => {
        const headerB64 = base64UrlEncodeString(
          JSON.stringify({ alg: 'ES256', typ: 'CODEACCESS' })
        )
        const payloadB64 = base64UrlEncodeString(
          JSON.stringify({
            project,
            exp,
            secret,
          })
        )
        return { headerB64, payloadB64 }
      })()

  const signedToken = token
    ? (() => {
        const toSign = `${token.headerB64}.${token.payloadB64}`
        return signEs256({
          privateJwk: keypair.privateJwk,
          data: encoder.encode(toSign),
        }).then((signature) => `${toSign}.${base64UrlEncodeBytes(signature)}`)
      })()
    : null

  const saltBytes = randomBytes(16)
  const salt = base64UrlEncodeBytes(saltBytes)

  const aesKey = await deriveAesKey({
    secret: `${salt}:${secret}`,
    saltBytes,
    iterations,
  })

  const samplesOut = []

  for (const samplePath of samples) {
    const code = await readFile(samplePath, 'utf8')
    const language = args.language ? String(args.language) : guessLanguage(samplePath)
    const html = await codeToHtmlSafe(code, language)

    const ivBytes = randomBytes(12)
    const ciphertextBytes = await encryptUtf8({
      key: aesKey,
      ivBytes,
      plaintext: html,
    })

    samplesOut.push({
      id: titleFromPath(samplePath),
      title: titleFromPath(samplePath),
      language,
      iv: base64UrlEncodeBytes(ivBytes),
      ciphertext: base64UrlEncodeBytes(ciphertextBytes),
    })
  }

  const codeAccess = {
    expiresAt: new Date(exp).toISOString(),
    salt,
    kdfIterations: iterations,
    samples: samplesOut,
  }

  if (useStoreSecret) {
    if (out) {
      await writeJsonOut(out, { codeAccess })
      return
    }
    process.stdout.write(JSON.stringify({ codeAccess }, null, 2) + '\n')
    return
  }

  const signed = await signedToken

  const publicKeyJwkString = JSON.stringify(keypair.publicJwk)
  const privateKeyJwkString = JSON.stringify(keypair.privateJwk)

  const result = {
    publicKeyJwk: keypair.publicJwk,
    privateKeyJwk: keypair.privateJwk,
    env: {
      PUBLIC_CODE_ACCESS_PUBLIC_KEY_JWK: publicKeyJwkString,
      CODE_ACCESS_PRIVATE_KEY_JWK: privateKeyJwkString,
    },
    token: signed,
    urlPath: `/portfolio/${project}?token=${signed}`,
    codeAccess,
  }

  if (out) {
    await writeJsonOut(out, result)
    return
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}

main().catch((err) => {
  process.stderr.write(String(err instanceof Error ? err.message : err) + '\n')
  process.exitCode = 1
})
