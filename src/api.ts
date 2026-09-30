import { safeStorage } from './storage'
import type { CleanupSlot, EcoMarker, PlatformStats, User, WasteVolume } from './types'

const apiBase = (import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:8000')).replace(/\/$/, '')
const tokenKey = 'eco-access-token'
const DAY_MS = 24 * 60 * 60 * 1000

type ApiUser = { firstName: string; lastName: string; email: string }
type ApiMarker = {
  id: number
  lat: number
  lng: number
  address: string
  categories: string[]
  volume: WasteVolume
  description: string
  photo: string
  date: string
  author: string
  creatorEmail: string
  status: 'active' | 'cleanup_requested' | 'cleaned'
  cleanupSlots: CleanupSlot[]
  cleanedAt: string | null
  evidencePhoto: string | null
  isCleared: boolean
}

export type MarkerDraft = Pick<EcoMarker, 'lat' | 'lng' | 'address' | 'categories' | 'volume' | 'description' | 'photo'>

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = safeStorage.get(tokenKey)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBase}/api${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`
    try {
      const body = await response.json() as { detail?: string | Array<{ msg?: string }> }
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = body.detail.map((item) => item.msg).filter(Boolean).join('. ') || message
    } catch {
      // Сохраняем сообщение со статусом, если сервер вернул не JSON.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function assetUrl(value: string | null | undefined) {
  if (!value) return ''
  return value.startsWith('/uploads/') ? `${apiBase}${value}` : value
}

function toUser(user: ApiUser): User {
  return { firstName: user.firstName, lastName: user.lastName, email: user.email }
}

function toMarker(marker: ApiMarker): EcoMarker {
  const requestedAt = marker.status === 'cleanup_requested' ? marker.cleanedAt : null
  return {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lng,
    address: marker.address,
    categories: marker.categories,
    volume: marker.volume,
    description: marker.description,
    photo: assetUrl(marker.photo),
    date: new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date(marker.date)),
    author: marker.author,
    creatorEmail: marker.creatorEmail,
    status: marker.status === 'cleanup_requested' ? 'cleanup_requested' : 'active',
    cleanupSlots: Array.isArray(marker.cleanupSlots) ? marker.cleanupSlots : [],
    cleanupRequest: requestedAt ? {
      requestedByEmail: '',
      requestedByName: 'пользователь карты',
      requestedAt,
      reviewUntil: new Date(new Date(requestedAt).getTime() + DAY_MS).toISOString(),
      evidencePhoto: assetUrl(marker.evidencePhoto),
    } : undefined,
    cleanedAt: marker.cleanedAt ?? undefined,
    evidencePhoto: assetUrl(marker.evidencePhoto) || undefined,
    isCleared: marker.isCleared,
  }
}

function markerForm(marker: MarkerDraft, photoFile?: File) {
  const body = new FormData()
  body.set('lat', String(marker.lat))
  body.set('lng', String(marker.lng))
  body.set('address', marker.address)
  body.set('categories', JSON.stringify(marker.categories))
  body.set('volume', marker.volume)
  body.set('description', marker.description)
  if (photoFile) body.set('photo_file', photoFile)
  else body.set('photo_url', marker.photo)
  return body
}

export async function authenticate(
  mode: 'login' | 'register',
  credentials: { email: string; password: string; firstName?: string; lastName?: string },
) {
  const result = await request<{ access_token: string; user: ApiUser }>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      ...(mode === 'register' ? { first_name: credentials.firstName, last_name: credentials.lastName } : {}),
    }),
  })
  safeStorage.set(tokenKey, result.access_token)
  return toUser(result.user)
}

export function clearToken() { safeStorage.remove(tokenKey) }
export function hasToken() { return safeStorage.get(tokenKey) !== null }
export async function getCurrentUser() { return toUser(await request<ApiUser>('/auth/me')) }
export async function getMarkers() { return (await request<ApiMarker[]>('/markers')).map(toMarker) }
export async function getStats() { return request<PlatformStats>('/stats') }

export async function createMarker(marker: MarkerDraft, photoFile?: File) {
  return toMarker(await request<ApiMarker>('/markers', { method: 'POST', body: markerForm(marker, photoFile) }))
}

export async function updateMarker(markerId: number, marker: MarkerDraft, photoFile?: File) {
  return toMarker(await request<ApiMarker>(`/markers/${markerId}`, { method: 'PATCH', body: markerForm(marker, photoFile) }))
}

export async function requestMarkerCleanup(markerId: number, evidenceFile: File) {
  const body = new FormData()
  body.set('evidence_photo', evidenceFile)
  return toMarker(await request<ApiMarker>(`/markers/${markerId}/cleanup`, { method: 'POST', body }))
}

export async function rejectMarkerCleanup(markerId: number) {
  return toMarker(await request<ApiMarker>(`/markers/${markerId}/cleanup/reject`, { method: 'POST' }))
}

export async function confirmMarkerCleanup(markerId: number) {
  await request<void>(`/markers/${markerId}/cleanup/confirm`, { method: 'POST' })
}

export async function createCleanupSlot(markerId: number, startsAt: string, peopleCount: number) {
  return toMarker(await request<ApiMarker>(`/markers/${markerId}/cleanup-slots`, {
    method: 'POST', body: JSON.stringify({ starts_at: startsAt, people_count: peopleCount }),
  }))
}

export async function joinCleanupSlot(markerId: number, slotId: number, peopleCount: number) {
  return toMarker(await request<ApiMarker>(`/markers/${markerId}/cleanup-slots/${slotId}/join`, {
    method: 'POST', body: JSON.stringify({ people_count: peopleCount }),
  }))
}

export async function deleteCleanupSlot(markerId: number, slotId: number) {
  return toMarker(await request<ApiMarker>(`/markers/${markerId}/cleanup-slots/${slotId}`, { method: 'DELETE' }))
}

export async function updateProfile(profile: Pick<User, 'firstName' | 'lastName'>) {
  return toUser(await request<ApiUser>('/users/me', {
    method: 'PATCH', body: JSON.stringify({ first_name: profile.firstName, last_name: profile.lastName }),
  }))
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  await request<void>('/users/me/password', {
    method: 'PATCH', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос'
}
