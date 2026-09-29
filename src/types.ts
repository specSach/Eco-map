export type Page = 'home' | 'map' | 'profile' | 'privacy'
export type WasteVolume = 'small' | 'medium' | 'large'
export type MarkerStatus = 'active' | 'cleanup_requested'

export type CleanupRequest = {
  requestedByEmail: string
  requestedByName: string
  requestedAt: string
  reviewUntil: string
  evidencePhoto: string
}

export type CleanupParticipant = {
  email: string
  name: string
  peopleCount: number
}

export type CleanupSlot = {
  id: number
  startsAt: string
  creatorEmail: string
  creatorName: string
  participants: CleanupParticipant[]
}

export type EcoMarker = {
  id: number
  lat: number
  lng: number
  address: string
  categories: string[]
  volume: WasteVolume
  description: string
  date: string
  photo: string
  author: string
  creatorEmail: string
  status: MarkerStatus
  cleanupRequest?: CleanupRequest
  cleanupSlots: CleanupSlot[]
}

export type User = {
  firstName: string
  lastName: string
  email: string
}
