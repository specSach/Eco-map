import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialMarkers } from './data'
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
    return JSON.parse(localStorage.getItem('eco-accounts') || '{}') as Accounts
  } catch {
    return {}
  }
}

function saveAccount(user: User) {
  const accounts = readAccounts()
  accounts[accountKey(user.email)] = user
  localStorage.setItem('eco-accounts', JSON.stringify(accounts))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => localStorage.getItem('eco-theme') === 'dark')
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('eco-user')
    if (!saved) return null
    const savedUser = JSON.parse(saved) as User
    // Migrate the previously active profile to the email-based account storage.
    if (!readAccounts()[accountKey(savedUser.email)]) saveAccount(savedUser)
    return savedUser
  })
  const [markers, setMarkers] = useState<EcoMarker[]>(() => {
    const saved = localStorage.getItem('eco-markers')
    // IDs 1–3 belonged to the first visual demo and are removed during migration.
    return saved ? (JSON.parse(saved) as EcoMarker[]).filter((marker) => marker.id > 3) : initialMarkers
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('eco-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => localStorage.setItem('eco-markers', JSON.stringify(markers)), [markers])

  const value = useMemo<Store>(() => ({
    dark,
    setDark: setDarkState,
    user,
    findAccount: (email) => readAccounts()[accountKey(email)] ?? null,
    login: (nextUser) => {
      setUser(nextUser)
      localStorage.setItem('eco-user', JSON.stringify(nextUser))
      saveAccount(nextUser)
    },
    logout: () => {
      setUser(null)
      localStorage.removeItem('eco-user')
    },
    updateUser: (nextUser) => {
      setUser(nextUser)
      localStorage.setItem('eco-user', JSON.stringify(nextUser))
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
