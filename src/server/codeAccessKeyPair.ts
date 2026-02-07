import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { generateKeyPairSync } from 'node:crypto'

type KeyPairStore = {
  privateJwk: JsonWebKey
  publicJwk: JsonWebKey
  createdAt: string
}

function resolveKeyPath() {
  return join(process.cwd(), '.data', 'code-access', 'keypair.json')
}

async function readKeyStore(): Promise<KeyPairStore | null> {
  const filePath = resolveKeyPath()
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed?.privateJwk || !parsed?.publicJwk) return null
    return parsed
  } catch {
    return null
  }
}

async function writeKeyStore(data: KeyPairStore): Promise<void> {
  const filePath = resolveKeyPath()
  await mkdir(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  await rename(tmpPath, filePath)
}

export async function getOrCreateCodeAccessKeyPair(): Promise<KeyPairStore> {
  const existing = await readKeyStore()
  if (existing) return existing

  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  })

  const privateJwk = privateKey.export({ format: 'jwk' }) as JsonWebKey
  const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey

  const created: KeyPairStore = {
    privateJwk,
    publicJwk,
    createdAt: new Date().toISOString(),
  }

  await writeKeyStore(created)
  return created
}
