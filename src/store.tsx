import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ApiError,
  authenticate,
  clearToken,
  confirmMarkerCleanup,
  createCleanupSlot,
  createMarker,
  deleteCleanupSlot,
  errorMessage,
  getCurrentUser,
  getMarkers,
  getMyStats,
  getStats,
  hasToken,
  joinCleanupSlot as joinCleanupSlotApi,
  rejectMarkerCleanup,
  requestMarkerCleanup,
  updateMarker as updateMarkerApi,
  updatePassword as updatePasswordApi,
  updateProfile,
  type MarkerDraft,
} from './api'
import { safeStorage } from './storage'
import type { EcoMarker, PlatformStats, User, UserStats } from './types'

type Store = {
  dark: boolean
  setDark: (value: boolean) => void
  user: User | null
  userStats: UserStats | null
  stats: PlatformStats | null
  markers: EcoMarker[]
  error: string
  clearError: () => void
  login: (mode: 'login' | 'register', credentials: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<void>
  logout: () => void
  updateUser: (user: Pick<User, 'firstName' | 'lastName'>) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  addMarker: (marker: MarkerDraft, photo?: File) => Promise<void>
  updateMarker: (id: number, marker: MarkerDraft, photo?: File) => Promise<boolean>
  requestCleanup: (id: number, evidencePhoto: File) => Promise<boolean>
  undoCleanup: (id: number) => Promise<boolean>
  confirmCleanup: (id: number) => Promise<boolean>
  addCleanupSlot: (markerId: number, startsAt: string, peopleCount: number) => Promise<boolean>
  joinCleanupSlot: (markerId: number, slotId: number, peopleCount: number) => Promise<boolean>
  removeCleanupSlot: (markerId: number, slotId: number) => Promise<boolean>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => safeStorage.get('eco-theme') === 'dark')
  const [user, setUser] = useState<User | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [markers, setMarkers] = useState<EcoMarker[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState('')
  const refreshInFlight = useRef(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    safeStorage.set('eco-theme', dark ? 'dark' : 'light')
  }, [dark])

  const reportError = useCallback((reason: unknown) => {
    setError(errorMessage(reason))
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      setStats(await getStats())
    } catch (reason) {
      reportError(reason)
    }
  }, [reportError])

  const refreshUserStats = useCallback(async () => {
    if (!hasToken()) {
      setUserStats(null)
      return
    }
    try {
      setUserStats(await getMyStats())
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        clearToken()
        setUser(null)
        setUserStats(null)
      } else {
        reportError(reason)
      }
    }
  }, [reportError])

  const refreshMarkers = useCallback(async () => {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    try {
      setMarkers(await getMarkers())
    } catch (reason) {
      reportError(reason)
    } finally {
      refreshInFlight.current = false
    }
  }, [reportError])

  useEffect(() => {
    let active = true
    void Promise.allSettled([getMarkers(), getStats()]).then(([markerResult, statsResult]) => {
      if (!active) return
      if (markerResult.status === 'fulfilled') setMarkers(markerResult.value)
      else reportError(markerResult.reason)
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      else reportError(statsResult.reason)
    })

    if (hasToken()) {
      void getCurrentUser()
        .then((currentUser) => {
          if (!active || !hasToken()) return
          setUser(currentUser)
          void refreshUserStats()
        })
        .catch((reason: unknown) => {
          if (!active) return
          if (reason instanceof ApiError && reason.status === 401) clearToken()
          else reportError(reason)
        })
    }

    const refreshTimer = window.setInterval(() => {
      void refreshMarkers()
      void refreshStats()
      if (hasToken()) void refreshUserStats()
    }, 60_000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [refreshMarkers, refreshStats, refreshUserStats, reportError])

  useEffect(() => {
    const deadlineTimer = window.setInterval(() => {
      const expired = markers.some((marker) => marker.status === 'cleanup_requested'
        && marker.cleanupRequest
        && new Date(marker.cleanupRequest.reviewUntil).getTime() <= Date.now())
      if (expired) {
        void refreshMarkers()
        void refreshStats()
      }
    }, 1_000)
    return () => window.clearInterval(deadlineTimer)
  }, [markers, refreshMarkers, refreshStats])

  const replaceMarker = useCallback((updated: EcoMarker) => {
    setMarkers((current) => current.map((marker) => marker.id === updated.id ? updated : marker))
  }, [])

  const guarded = useCallback(async (action: () => Promise<void>) => {
    try {
      setError('')
      await action()
      return true
    } catch (reason) {
      reportError(reason)
      return false
    }
  }, [reportError])

  const value = useMemo<Store>(() => ({
    dark,
    setDark: setDarkState,
    user,
    userStats,
    stats,
    markers,
    error,
    clearError: () => setError(''),
    login: async (mode, credentials) => {
      try {
        setError('')
        setUser(await authenticate(mode, credentials))
        await Promise.all([refreshMarkers(), refreshStats(), refreshUserStats()])
      } catch (reason) {
        reportError(reason)
        throw reason
      }
    },
    logout: () => {
      clearToken()
      setUser(null)
      setUserStats(null)
    },
    updateUser: async (profile) => {
      try {
        setError('')
        setUser(await updateProfile(profile))
        await refreshMarkers()
      } catch (reason) {
        reportError(reason)
        throw reason
      }
    },
    updatePassword: async (currentPassword, newPassword) => {
      try {
        setError('')
        await updatePasswordApi(currentPassword, newPassword)
      } catch (reason) {
        reportError(reason)
        throw reason
      }
    },
    addMarker: async (marker, photo) => {
      try {
        setError('')
        const created = await createMarker(marker, photo)
        setMarkers((current) => [created, ...current])
        await Promise.all([refreshStats(), refreshUserStats()])
      } catch (reason) {
        reportError(reason)
        throw reason
      }
    },
    updateMarker: (id, marker, photo) => guarded(async () => {
      replaceMarker(await updateMarkerApi(id, marker, photo))
    }),
    requestCleanup: (id, evidencePhoto) => guarded(async () => {
      replaceMarker(await requestMarkerCleanup(id, evidencePhoto))
      await refreshStats()
    }),
    undoCleanup: (id) => guarded(async () => {
      replaceMarker(await rejectMarkerCleanup(id))
      await refreshStats()
    }),
    confirmCleanup: (id) => guarded(async () => {
      await confirmMarkerCleanup(id)
      setMarkers((current) => current.filter((marker) => marker.id !== id))
      await refreshStats()
    }),
    addCleanupSlot: (markerId, startsAt, peopleCount) => guarded(async () => {
      replaceMarker(await createCleanupSlot(markerId, startsAt, peopleCount))
    }),
    joinCleanupSlot: (markerId, slotId, peopleCount) => guarded(async () => {
      replaceMarker(await joinCleanupSlotApi(markerId, slotId, peopleCount))
    }),
    removeCleanupSlot: (markerId, slotId) => guarded(async () => {
      replaceMarker(await deleteCleanupSlot(markerId, slotId))
    }),
  }), [dark, error, guarded, markers, refreshMarkers, refreshStats, refreshUserStats, replaceMarker, reportError, stats, user, userStats])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be inside StoreProvider')
  return value
}
