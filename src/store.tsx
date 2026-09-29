import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialMarkers } from './data'
import { safeStorage } from './storage'
import type { CleanupSlot, EcoMarker, User } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

type Store = {
  dark: boolean
  setDark: (value: boolean) => void
  user: User | null
  register: (user: User, password: string) => Promise<boolean>
  authenticate: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (user: User) => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  markers: EcoMarker[]
  addMarker: (marker: Omit<EcoMarker, 'id' | 'date' | 'author' | 'creatorEmail' | 'status' | 'cleanupSlots'>) => void
  updateMarker: (id: number, marker: Partial<Pick<EcoMarker, 'lat' | 'lng' | 'address' | 'categories' | 'volume' | 'description' | 'photo'>>) => boolean
  requestCleanup: (id: number, evidencePhoto: string) => boolean
  undoCleanup: (id: number) => boolean
  confirmCleanup: (id: number) => boolean
  addCleanupSlot: (markerId: number, startsAt: string, peopleCount: number) => boolean
  joinCleanupSlot: (markerId: number, slotId: number, peopleCount: number) => boolean
}

const StoreContext = createContext<Store | null>(null)

type StoredAccount = User & { passwordHash?: string }
type Accounts = Record<string, StoredAccount>

const accountKey = (email: string) => email.trim().toLowerCase()

function readAccounts(): Accounts {
  try {
    return JSON.parse(safeStorage.get('eco-accounts') || '{}') as Accounts
  } catch {
    return {}
  }
}

function saveAccount(user: User, passwordHash?: string) {
  const accounts = readAccounts()
  const existing = accounts[accountKey(user.email)]
  accounts[accountKey(user.email)] = { ...user, passwordHash: passwordHash ?? existing?.passwordHash }
  safeStorage.set('eco-accounts', JSON.stringify(accounts))
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function normalizeMarker(marker: EcoMarker, currentUser?: User | null): EcoMarker {
  const legacyAuthor = currentUser ? `${currentUser.firstName} ${currentUser.lastName.charAt(0)}.` : ''
  return {
    ...marker,
    creatorEmail: marker.creatorEmail ?? (legacyAuthor && marker.author === legacyAuthor ? currentUser?.email ?? '' : ''),
    status: marker.status ?? 'active',
    cleanupSlots: Array.isArray(marker.cleanupSlots) ? marker.cleanupSlots : [],
  }
}

function processDeadlines(markers: EcoMarker[], now = Date.now()) {
  const activeMarkers = markers.filter((marker) => {
    if (marker.status === 'cleanup_requested' && marker.cleanupRequest && new Date(marker.cleanupRequest.reviewUntil).getTime() <= now) return false
    return true
  })

  return activeMarkers.length === markers.length ? markers : activeMarkers
}

const sameEmail = (first?: string, second?: string) => Boolean(first && second && accountKey(first) === accountKey(second))

const CLEAN_START_VERSION = 'no-demo-session-or-markers-v1'

function migrateToCleanStart() {
  if (safeStorage.get('eco-clean-start-version') === CLEAN_START_VERSION) return
  safeStorage.remove('eco-user')
  safeStorage.remove('eco-markers')
  safeStorage.set('eco-clean-start-version', CLEAN_START_VERSION)
}

migrateToCleanStart()

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => safeStorage.get('eco-theme') === 'dark')
  const [user, setUser] = useState<User | null>(() => {
    const saved = safeStorage.get('eco-user')
    if (!saved) return null
    try {
      const savedUser = JSON.parse(saved) as User
      // Migrate the previously active profile to the email-based account storage.
      if (!readAccounts()[accountKey(savedUser.email)]) saveAccount(savedUser)
      return savedUser
    } catch {
      safeStorage.remove('eco-user')
      return null
    }
  })
  const [markers, setMarkers] = useState<EcoMarker[]>(() => {
    const saved = safeStorage.get('eco-markers')
    try {
      // IDs 1–3 belonged to the first visual demo and are removed during migration.
      const parsed = saved ? (JSON.parse(saved) as EcoMarker[]).filter((marker) => marker.id > 3) : initialMarkers
      return processDeadlines(parsed.map((marker) => normalizeMarker(marker, user)))
    } catch {
      safeStorage.remove('eco-markers')
      return initialMarkers
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    safeStorage.set('eco-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => safeStorage.set('eco-markers', JSON.stringify(markers)), [markers])
  useEffect(() => {
    const timer = window.setInterval(() => setMarkers((current) => processDeadlines(current)), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const value = useMemo<Store>(() => ({
    dark,
    setDark: setDarkState,
    user,
    register: async (nextUser, password) => {
      if (readAccounts()[accountKey(nextUser.email)]) return false
      setUser(nextUser)
      safeStorage.set('eco-user', JSON.stringify(nextUser))
      saveAccount(nextUser, await hashPassword(password))
      return true
    },
    authenticate: async (email, password) => {
      const account = readAccounts()[accountKey(email)]
      if (!account) return false
      const passwordHash = await hashPassword(password)
      if (account.passwordHash && account.passwordHash !== passwordHash) return false
      const nextUser = { firstName: account.firstName, lastName: account.lastName, email: account.email }
      if (!account.passwordHash) saveAccount(nextUser, passwordHash)
      setUser(nextUser)
      safeStorage.set('eco-user', JSON.stringify(nextUser))
      return true
    },
    logout: () => {
      setUser(null)
      safeStorage.remove('eco-user')
    },
    updateUser: (nextUser) => {
      const previousEmail = user?.email
      setUser(nextUser)
      safeStorage.set('eco-user', JSON.stringify(nextUser))
      saveAccount(nextUser)
      setMarkers((current) => current.map((marker) => sameEmail(marker.creatorEmail, previousEmail) ? {
        ...marker,
        creatorEmail: nextUser.email,
        author: `${nextUser.firstName} ${nextUser.lastName.charAt(0)}.`,
      } : marker))
    },
    changePassword: async (currentPassword, newPassword) => {
      if (!user) return false
      const account = readAccounts()[accountKey(user.email)]
      if (!account) return false
      const currentHash = await hashPassword(currentPassword)
      if (account.passwordHash && account.passwordHash !== currentHash) return false
      saveAccount(user, await hashPassword(newPassword))
      return true
    },
    markers,
    addMarker: (marker) => setMarkers((current) => [{
      ...marker,
      id: Date.now(),
      date: new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      }).format(new Date()),
      author: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Пользователь',
      creatorEmail: user?.email ?? '',
      status: 'active',
      cleanupSlots: [],
    }, ...current]),
    updateMarker: (id, patch) => {
      const allowed = markers.some((marker) => marker.id === id && sameEmail(marker.creatorEmail, user?.email))
      if (!allowed) return false
      setMarkers((current) => current.map((marker) => marker.id === id ? { ...marker, ...patch } : marker))
      return true
    },
    requestCleanup: (id, evidencePhoto) => {
      if (!user) return false
      const marker = markers.find((item) => item.id === id)
      if (!marker || marker.status !== 'active') return false
      const requestedAt = new Date()
      setMarkers((current) => current.map((item) => item.id === id ? {
        ...item,
        status: 'cleanup_requested',
        cleanupRequest: {
          requestedByEmail: user.email,
          requestedByName: `${user.firstName} ${user.lastName}`.trim(),
          requestedAt: requestedAt.toISOString(),
          reviewUntil: new Date(requestedAt.getTime() + DAY_MS).toISOString(),
          evidencePhoto,
        },
      } : item))
      return true
    },
    undoCleanup: (id) => {
      if (!user || !markers.some((item) => item.id === id && item.status === 'cleanup_requested' && sameEmail(item.creatorEmail, user.email))) return false
      setMarkers((current) => current.map((item) => item.id === id ? {
        ...item,
        status: 'active',
        cleanupRequest: undefined,
      } : item))
      return true
    },
    confirmCleanup: (id) => {
      if (!user || !markers.some((item) => item.id === id && item.status === 'cleanup_requested' && sameEmail(item.creatorEmail, user.email))) return false
      setMarkers((current) => current.filter((item) => item.id !== id))
      return true
    },
    addCleanupSlot: (markerId, startsAt, peopleCount) => {
      if (!user || !markers.some((item) => item.id === markerId)) return false
      const participant = { email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), peopleCount }
      const slot: CleanupSlot = {
        id: Date.now(), startsAt, creatorEmail: user.email, creatorName: participant.name, participants: [participant],
      }
      setMarkers((current) => current.map((item) => item.id === markerId ? { ...item, cleanupSlots: [...item.cleanupSlots, slot].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) } : item))
      return true
    },
    joinCleanupSlot: (markerId, slotId, peopleCount) => {
      if (!user || !markers.some((item) => item.id === markerId)) return false
      const participant = { email: user.email, name: `${user.firstName} ${user.lastName}`.trim(), peopleCount }
      setMarkers((current) => current.map((item) => item.id === markerId ? {
        ...item,
        cleanupSlots: item.cleanupSlots.map((slot) => slot.id === slotId ? {
          ...slot,
          participants: [...slot.participants.filter((entry) => !sameEmail(entry.email, user.email)), participant],
        } : slot),
      } : item))
      return true
    },
  }), [dark, markers, user])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be inside StoreProvider')
  return value
}
