import type { EcoMarker, User, WasteVolume } from './types'
import { safeStorage } from './storage'

const apiBase = (import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : (import.meta.env.PROD ? '' : 'http://localhost:8000')).replace(/\/$/, '') 
const tokenKey = 'eco-access-token'

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
  isCleared: boolean
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = safeStorage.get(tokenKey)
  if (token) headers.set('Authorization', 'Bearer ' + token)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBase}/api${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function toUser(user: ApiUser): User {
  return { firstName: user.firstName, lastName: user.lastName, email: user.email }
}

function toMarker(marker: ApiMarker): EcoMarker {
  return {
    id: marker.id,
    lat: marker.lat,
    lng: marker.lng,
    address: marker.address,
    categories: marker.categories,
    volume: marker.volume,
    description: marker.description,
    photo: marker.photo.startsWith('/uploads/') ? `${apiBase}${marker.photo}` : marker.photo,
    date: new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date(marker.date)),
    author: marker.author,
    isCleared: marker.isCleared,
  }
}

export async function authenticate(
  mode: 'login' | 'register',
  credentials: { email: string; password: string; firstName?: string; lastName?: string },
): Promise<User> {
  const result = await request<{ access_token: string; user: ApiUser }>(`/auth/${mode === 'login' ? 'login' : 'register'}`, {
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

export function clearToken() {
  safeStorage.remove(tokenKey)
}

export function hasToken() {
  return safeStorage.get(tokenKey) !== null
}

export async function getCurrentUser() {
  return toUser(await request<ApiUser>('/auth/me'))
}

export async function getMarkers() {
  return (await request<ApiMarker[]>('/markers')).map(toMarker)
}

export async function createMarker(
  marker: Omit<EcoMarker, 'id' | 'date' | 'author' | 'isCleared'>,
  photoFile?: File,
) {
  const body = new FormData()
  body.set('lat', String(marker.lat))
  body.set('lng', String(marker.lng))
  body.set('address', marker.address)
  body.set('categories', JSON.stringify(marker.categories))
  body.set('volume', marker.volume)
  body.set('description', marker.description)
  if (photoFile) body.set('photo_file', photoFile)
  else body.set('photo_url', marker.photo)
  return toMarker(await request<ApiMarker>('/markers', { method: 'POST', body }))
}

export async function clearMarker(id: number) {
  await request<void>(`/markers/${id}`, { method: 'DELETE' })
}

export async function updateProfile(profile: Pick<User, 'firstName' | 'lastName'>) {
  return toUser(await request<ApiUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ first_name: profile.firstName, last_name: profile.lastName }),
  }))
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  await request<void>('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос'
}
