import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, authenticate, clearMarker as deleteMarker, clearToken, createMarker, errorMessage, getCurrentUser, getMarkers, hasToken, updatePassword as savePassword, updateProfile } from './api'
import { safeStorage } from './storage'
import type { EcoMarker, User } from './types'

type Store = {
  dark: boolean
  setDark: (value: boolean) => void
  user: User | null
  login: (mode: 'login' | 'register', credentials: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>
  logout: () => void
  updateUser: (user: Pick<User, 'firstName' | 'lastName'>) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  markers: EcoMarker[]
  addMarker: (marker: Omit<EcoMarker, 'id' | 'date' | 'author' | 'isCleared'>, photo?: File) => Promise<void>
  clearMarker: (id: number) => Promise<void>
  error: string
  clearError: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => safeStorage.get('eco-theme') === 'dark')
  const [user, setUser] = useState<User | null>(null)
  const [markers, setMarkers] = useState<EcoMarker[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    safeStorage.set('eco-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    let active = true
    void getMarkers()
      .then((items) => { if (active) setMarkers(items) })
      .catch((reason: unknown) => { if (active) setError(errorMessage(reason)) })

    if (hasToken()) {
      void getCurrentUser()
        .then((currentUser) => { if (active && hasToken()) setUser(currentUser) })
        .catch((reason: unknown) => {
          if (!active) return
          if (reason instanceof ApiError && reason.status === 401) clearToken()
          setError(errorMessage(reason))
        })
    }
    return () => { active = false }
  }, [])

  const value = useMemo<Store>(() => ({
    dark,
    setDark: setDarkState,
    user,
    login: async (mode, credentials) => {
      try {
        setError('')
        setUser(await authenticate(mode, credentials))
      } catch (reason) {
        setError(errorMessage(reason))
        throw reason
      }
    },
    logout: () => {
      clearToken()
      setUser(null)
    },
    updateUser: async (profile) => {
      try {
        setError('')
        setUser(await updateProfile(profile))
      } catch (reason) {
        setError(errorMessage(reason))
        throw reason
      }
    },
    updatePassword: async (currentPassword, newPassword) => {
      try {
        setError('')
        await savePassword(currentPassword, newPassword)
      } catch (reason) {
        setError(errorMessage(reason))
        throw reason
      }
    },
    markers,
    addMarker: async (marker, photo) => {
      try {
        setError('')
        const created = await createMarker(marker, photo)
        setMarkers((current) => [created, ...current])
      } catch (reason) {
        setError(errorMessage(reason))
        throw reason
      }
    },
    clearMarker: async (id) => {
      try {
        setError('')
        await deleteMarker(id)
        setMarkers((current) => current.filter((marker) => marker.id !== id))
      } catch (reason) {
        setError(errorMessage(reason))
        throw reason
      }
    },
    error,
    clearError: () => setError(''),
  }), [dark, error, markers, user])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be inside StoreProvider')
  return value
}
