import { getStore } from '@netlify/blobs'
import { randomBytes } from 'node:crypto'
import { Buffer } from 'node:buffer'

export type CodeAccessScope = {
  projectSlug: string
  sampleIds: string[]
}

export type CodeAccessProjectRecord = {
  projectSlug: string
  secret: string
  createdAt: string
}

export type CodeAccessTokenRecord = {
  id: string
  label?: string
  createdAt: string
  expiresAt: string
  scopes: CodeAccessScope[]
  uses: number
  usesByProject: Record<string, number>
  firstUsedAt?: string
  lastUsedAt?: string
  revokedAt?: string
}

type TokenStoreData = {
  tokens: CodeAccessTokenRecord[]
  projects: Record<string, CodeAccessProjectRecord>
}

const STORE_KEY = 'code-access-tokens'

const defaultStore: TokenStoreData = { tokens: [], projects: {} }

function getBlobStore() {
  return getStore({ name: 'code-access' })
}

async function readStore(): Promise<TokenStoreData> {
  try {
    const store = getBlobStore()
    const raw = await store.get(STORE_KEY)
    if (!raw) return defaultStore

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultStore
    if (!Array.isArray(parsed.tokens)) return defaultStore
    const projects = parsed.projects && typeof parsed.projects === 'object' ? parsed.projects : {}
    return { tokens: parsed.tokens, projects }
  } catch {
    return defaultStore
  }
}

async function writeStore(data: TokenStoreData): Promise<void> {
  const store = getBlobStore()
  await store.set(STORE_KEY, JSON.stringify(data, null, 2))
}

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function generateTokenId(): string {
  return base64Url(randomBytes(18))
}

export function generateTokenSecret(): string {
  return base64Url(randomBytes(32))
}

export async function getOrCreateProjectSecret(projectSlug: string): Promise<string> {
  const store = await readStore()
  const existing = store.projects[projectSlug]
  if (existing?.secret) return existing.secret

  const now = new Date().toISOString()
  const created: CodeAccessProjectRecord = {
    projectSlug,
    secret: generateTokenSecret(),
    createdAt: now,
  }

  store.projects[projectSlug] = created
  await writeStore(store)
  return created.secret
}

export async function listProjects(): Promise<CodeAccessProjectRecord[]> {
  const store = await readStore()
  return Object.values(store.projects)
}

export async function listTokens(): Promise<CodeAccessTokenRecord[]> {
  const store = await readStore()
  return store.tokens
}

export async function getTokenById(id: string): Promise<CodeAccessTokenRecord | undefined> {
  const store = await readStore()
  return store.tokens.find((t) => t.id === id)
}

export async function createToken(input: {
  label?: string
  expiresAt: string
  scopes: CodeAccessScope[]
}): Promise<CodeAccessTokenRecord> {
  const now = new Date().toISOString()

  for (const scope of input.scopes) {
    await getOrCreateProjectSecret(scope.projectSlug)
  }

  const token: CodeAccessTokenRecord = {
    id: generateTokenId(),
    label: input.label?.trim() ? input.label.trim() : undefined,
    createdAt: now,
    expiresAt: input.expiresAt,
    scopes: input.scopes,
    uses: 0,
    usesByProject: {},
  }

  const store = await readStore()
  store.tokens.unshift(token)
  await writeStore(store)
  return token
}

export async function updateToken(
  id: string,
  patch: Partial<Pick<CodeAccessTokenRecord, 'label' | 'expiresAt' | 'scopes'>> & {
    revokedAt?: string | null
  }
): Promise<CodeAccessTokenRecord | undefined> {
  const store = await readStore()
  const idx = store.tokens.findIndex((t) => t.id === id)
  if (idx === -1) return undefined

  const current = store.tokens[idx]
  const next: CodeAccessTokenRecord = {
    ...current,
    label:
      typeof patch.label === 'string'
        ? patch.label.trim() || undefined
        : current.label,
    expiresAt: typeof patch.expiresAt === 'string' ? patch.expiresAt : current.expiresAt,
    scopes: Array.isArray(patch.scopes) ? patch.scopes : current.scopes,
    revokedAt:
      patch.revokedAt === null
        ? undefined
        : typeof patch.revokedAt === 'string'
          ? patch.revokedAt
          : current.revokedAt,
  }

  store.tokens[idx] = next
  await writeStore(store)
  return next
}

export async function deleteToken(id: string): Promise<boolean> {
  const store = await readStore()
  const next = store.tokens.filter((t) => t.id !== id)
  if (next.length === store.tokens.length) return false
  await writeStore({ tokens: next, projects: store.projects })
  return true
}

export async function recordTokenUse(input: {
  tokenId: string
  projectSlug: string
}): Promise<CodeAccessTokenRecord | undefined> {
  const store = await readStore()
  const idx = store.tokens.findIndex((t) => t.id === input.tokenId)
  if (idx === -1) return undefined

  const token = store.tokens[idx]
  const now = new Date().toISOString()

  const next: CodeAccessTokenRecord = {
    ...token,
    uses: (token.uses ?? 0) + 1,
    usesByProject: {
      ...(token.usesByProject ?? {}),
      [input.projectSlug]: ((token.usesByProject ?? {})[input.projectSlug] ?? 0) + 1,
    },
    firstUsedAt: token.firstUsedAt ?? now,
    lastUsedAt: now,
  }

  store.tokens[idx] = next
  await writeStore(store)
  return next
}

export function isExpired(expiresAt: string, now = Date.now()): boolean {
  const ms = Date.parse(expiresAt)
  return Number.isFinite(ms) ? ms <= now : false
}

export function isRevoked(token: CodeAccessTokenRecord): boolean {
  return Boolean(token.revokedAt)
}

export function tokenAllowsProject(token: CodeAccessTokenRecord, projectSlug: string): CodeAccessScope | undefined {
  return token.scopes.find((s) => s.projectSlug === projectSlug)
}
