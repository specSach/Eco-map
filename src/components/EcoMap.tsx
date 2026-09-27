import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { EcoMarker, WasteVolume } from '../types'

const colors: Record<WasteVolume, string> = { small: '#48a46b', medium: '#e3a52b', large: '#e15d4f' }
const europeCenter: [number, number] = [54, 20]

function markerIcon(volume: WasteVolume, active = false) {
  return L.divIcon({
    className: '',
    html: `<div class="eco-pin${active ? ' active' : ''}" style="--pin:${colors[volume]}"><span></span></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
  })
}

function PositionPicker({ position, volume, onChange }: { position: [number, number]; volume: WasteVolume; onChange: (p: [number, number]) => void }) {
  useMapEvents({ click: (event) => onChange([event.latlng.lat, event.latlng.lng]) })
  return <Marker position={position} icon={markerIcon(volume, true)} />
}

function FlyTo({ position, zoom = 15 }: { position?: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => { if (position) map.flyTo(position, zoom, { duration: .7 }) }, [map, position, zoom])
  return null
}

export type EcoMapProps = {
  markers?: EcoMarker[]
  selectedId?: number | null
  onMarkerClick?: (marker: EcoMarker) => void
  pickerPosition?: [number, number]
  pickerVolume?: WasteVolume
  onPositionChange?: (position: [number, number]) => void
  center?: [number, number]
  focusPosition?: [number, number]
  focusZoom?: number
  zoom?: number
  interactive?: boolean
  className?: string
}

export function EcoMap({ markers = [], selectedId, onMarkerClick, pickerPosition, pickerVolume = 'small', onPositionChange, center = europeCenter, focusPosition, focusZoom = 15, zoom = 3, interactive = true, className = '' }: EcoMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={interactive} dragging={interactive} zoomControl={interactive} attributionControl className={`eco-map ${className}`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcon(marker.volume, selectedId === marker.id)} eventHandlers={{ click: () => onMarkerClick?.(marker) }} />
      ))}
      {pickerPosition && onPositionChange && <PositionPicker position={pickerPosition} volume={pickerVolume} onChange={onPositionChange} />}
      <FlyTo position={pickerPosition ?? focusPosition} zoom={pickerPosition ? 15 : focusZoom} />
    </MapContainer>
  )
}
