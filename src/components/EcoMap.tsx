import L from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { EcoMarker, WasteVolume } from '../types'

const colors: Record<WasteVolume, string> = { small: '#48a46b', medium: '#e3a52b', large: '#e15d4f' }
const russiaCenter: [number, number] = [57, 42]

function markerScale(zoom: number) {
  if (zoom <= 3) return .55
  if (zoom === 4) return .66
  if (zoom === 5) return .76
  if (zoom === 6) return .86
  if (zoom === 7) return .94
  return 1
}

function markerIcon(marker: Pick<EcoMarker, 'volume' | 'status'>, zoom: number, active = false) {
  const scale = markerScale(zoom)
  const onReview = marker.status !== 'active'
  const color = onReview ? '#858d88' : colors[marker.volume]
  return L.divIcon({
    className: '',
    html: `<div class="eco-pin${active ? ' active' : ''}${onReview ? ' pending-delete' : ''}" style="--pin:${color};--pin-scale:${scale}"><span></span></div>`,
    iconSize: [Math.round(36 * scale), Math.round(44 * scale)],
    iconAnchor: [Math.round(18 * scale), Math.round(42 * scale)],
  })
}

function PositionPicker({ position, volume, onChange }: { position: [number, number]; volume: WasteVolume; onChange: (p: [number, number]) => void }) {
  useMapEvents({ click: (event) => onChange([event.latlng.lat, event.latlng.lng]) })
  const map = useMap()
  return <Marker position={position} icon={markerIcon({ volume, status: 'active' }, map.getZoom(), true)} keyboard title="Выбранная позиция" />
}

function FlyTo({ position, zoom = 15 }: { position?: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => { if (position) map.flyTo(position, zoom, { duration: .7 }) }, [map, position, zoom])
  return null
}

function MarkerLayer({ markers, selectedId, onMarkerClick }: Pick<EcoMapProps, 'markers' | 'selectedId' | 'onMarkerClick'>) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) })
  return <>{(markers ?? []).map((marker) => (
    <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={markerIcon(marker, zoom, selectedId === marker.id)} keyboard title={`${marker.address}. ${marker.categories.join(', ')}`} eventHandlers={{ click: () => onMarkerClick?.(marker) }}>
    </Marker>
  ))}</>
}

function MapInteractions({ markers, onVisibleCountChange, onEscape }: { markers: EcoMarker[]; onVisibleCountChange?: (count: number) => void; onEscape?: () => void }) {
  const map = useMap()
  useEffect(() => {
    const update = () => {
      const bounds = map.getBounds()
      onVisibleCountChange?.(markers.filter((marker) => bounds.contains([marker.lat, marker.lng])).length)
    }
    update()
    map.on('moveend zoomend resize', update)
    return () => { map.off('moveend zoomend resize', update) }
  }, [map, markers, onVisibleCountChange])

  useEffect(() => {
    const container = map.getContainer()
    container.tabIndex = 0
    container.setAttribute('aria-label', 'Интерактивная карта. Используйте стрелки или WASD для перемещения, плюс и минус для масштаба.')
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, button')) return
      const distance = event.shiftKey ? 180 : 80
      const movement: Record<string, [number, number]> = {
        w: [0, -distance], W: [0, -distance], s: [0, distance], S: [0, distance],
        a: [-distance, 0], A: [-distance, 0], d: [distance, 0], D: [distance, 0],
      }
      if (movement[event.key]) { event.preventDefault(); map.panBy(movement[event.key]) }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); map.zoomIn() }
      if (event.key === '-') { event.preventDefault(); map.zoomOut() }
      if (event.key === 'Escape') onEscape?.()
    }
    container.addEventListener('keydown', keydown)
    return () => container.removeEventListener('keydown', keydown)
  }, [map, onEscape])
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
  onVisibleCountChange?: (count: number) => void
  onEscape?: () => void
}

export function EcoMap({ markers = [], selectedId, onMarkerClick, pickerPosition, pickerVolume = 'small', onPositionChange, center = russiaCenter, focusPosition, focusZoom = 15, zoom = 3, interactive = true, className = '', onVisibleCountChange, onEscape }: EcoMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={interactive} dragging={interactive} zoomControl={interactive} keyboard={interactive} touchZoom={interactive} doubleClickZoom={interactive} boxZoom={interactive} wheelDebounceTime={35} wheelPxPerZoomLevel={90} attributionControl className={`eco-map ${className}`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerLayer markers={markers} selectedId={selectedId} onMarkerClick={onMarkerClick} />
      {pickerPosition && onPositionChange && <PositionPicker position={pickerPosition} volume={pickerVolume} onChange={onPositionChange} />}
      <FlyTo position={pickerPosition ?? focusPosition} zoom={pickerPosition ? 15 : focusZoom} />
      {interactive && <MapInteractions markers={markers} onVisibleCountChange={onVisibleCountChange} onEscape={onEscape} />}
    </MapContainer>
  )
}
