import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialMarkers } from './data'
import { safeStorage } from './storage'
import type { EcoMarker, User } from './types'

type Store = {
  dark: boolean
  setDark: (value: boolean) => void
  user: User | null
  findAccount: (email: string) => User | null
  login: (user: User) => void
  logout: () => void
  updateUser: (user: User) => void
  markers: EcoMarker[]
  addMarker: (marker: Omit<EcoMarker, 'id' | 'date' | 'author'>) => void
  clearMarker: (id: number) => void
}

const StoreContext = createContext<Store | null>(null)

type Accounts = Record<string, User>

const accountKey = (email: string) => email.trim().toLowerCase()

function readAccounts(): Accounts {
  try {
    return JSON.parse(safeStorage.get('eco-accounts') || '{}') as Accounts
  } catch {
    return {}
  }
}

function saveAccount(user: User) {
  const accounts = readAccounts()
  accounts[accountKey(user.email)] = user
  safeStorage.set('eco-accounts', JSON.stringify(accounts))
}

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
      return saved ? (JSON.parse(saved) as EcoMarker[]).filter((marker) => marker.id > 3) : initialMarkers
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

  const value = useMemo<Store>(() => ({
    dark,
    setDark: setDarkState,
    user,
    findAccount: (email) => readAccounts()[accountKey(email)] ?? null,
    login: (nextUser) => {
      setUser(nextUser)
      safeStorage.set('eco-user', JSON.stringify(nextUser))
      saveAccount(nextUser)
    },
    logout: () => {
      setUser(null)
      safeStorage.remove('eco-user')
    },
    updateUser: (nextUser) => {
      setUser(nextUser)
      safeStorage.set('eco-user', JSON.stringify(nextUser))
      saveAccount(nextUser)
    },
    markers,
    addMarker: (marker) => setMarkers((current) => [{
      ...marker,
      id: Date.now(),
      date: new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      }).format(new Date()),
      author: user ? `${user.firstName} ${user.lastName.charAt(0)}.` : 'Пользователь',
    }, ...current]),
    clearMarker: (id) => setMarkers((current) => current.filter((marker) => marker.id !== id)),
  }), [dark, markers, user])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be inside StoreProvider')
  return value
}
