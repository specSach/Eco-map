export type Page = 'home' | 'map' | 'profile'
export type WasteVolume = 'small' | 'medium' | 'large'

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
  isCleared: boolean
}

export type User = {
  firstName: string
  lastName: string
  email: string
}
