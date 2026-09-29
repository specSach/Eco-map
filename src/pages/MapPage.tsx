import { Crosshair, Keyboard, ListFilter, LocateFixed, MapPin, Plus, Search } from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { LazyEcoMap } from '../components/LazyEcoMap'
import { useStore } from '../store'
import type { EcoMarker, WasteVolume } from '../types'

export function MapPage({ onAdd, onAuth, onSelect }: { onAdd: () => void; onAuth: () => void; onSelect: (m: EcoMarker) => void }) {
  const { markers, user } = useStore()
  const [filter, setFilter] = useState<'all' | WasteVolume | 'review'>('all')
  const [search, setSearch] = useState('')
  const [focusPosition, setFocusPosition] = useState<[number, number]>()
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [foundPlace, setFoundPlace] = useState('')
  const [visibleCount, setVisibleCount] = useState(0)
  const shown = useMemo(() => markers.filter((marker) => {
    if (filter === 'all') return true
    if (filter === 'review') return marker.status !== 'active'
    return marker.status === 'active' && marker.volume === filter
  }), [markers, filter])
  const updateVisibleCount = useCallback((count: number) => setVisibleCount(count), [])
  const add = onAdd
  const findCity = async (event: FormEvent) => {
    event.preventDefault()
    if (!search.trim()) return
    setSearchState('loading')
    setFoundPlace('')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(search)}`, { headers: { 'Accept-Language': 'ru' } })
      const [result] = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!result) throw new Error('not found')
      setFocusPosition([Number(result.lat), Number(result.lon)])
      setFoundPlace(result.display_name)
      setSearchState('idle')
    } catch {
      setSearchState('error')
    }
  }

  return (
    <main className="map-page">
      <section className="map-toolbar section-shell">
        <div><span className="eyebrow">Карта загрязнений</span><h1>Чистота начинается здесь</h1><p>Выберите метку, чтобы увидеть подробности, или добавьте новую.</p></div>
        <button className="button" onClick={add}><Plus size={19} /> Добавить точку</button>
      </section>
      <section className="map-workspace section-shell">
        <div className="map-controls">
          <div className="city-search-wrap">
            <form className="map-search" onSubmit={(event) => void findCity(event)}><Search size={18} /><input value={search} onChange={(e) => { setSearch(e.target.value); setSearchState('idle') }} placeholder="Введите город, например Казань" aria-label="Поиск города" /><button type="submit" disabled={searchState === 'loading'}>{searchState === 'loading' ? 'Ищем…' : 'Найти'}</button></form>
            {foundPlace && <span className="search-feedback success">Показано: {foundPlace}</span>}
            {searchState === 'error' && <span className="search-feedback error">Город не найден. Уточните название.</span>}
          </div>
          <div className="filter-row"><span><ListFilter size={17} /> Категория:</span>{([['all', 'Все'], ['small', 'Немного'], ['medium', 'Средне'], ['large', 'Много'], ['review', 'На проверке']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value !== 'all' && <i className={`volume-dot ${value === 'review' ? 'gray' : value}`} />}{label}</button>)}</div>
        </div>
        <div className="full-map-wrap">
          <LazyEcoMap eager markers={shown} onMarkerClick={onSelect} focusPosition={focusPosition} focusZoom={11} zoom={3} onVisibleCountChange={updateVisibleCount} />
          <div className="map-counter"><MapPin size={18} /><span><strong>{visibleCount}</strong> {pointWord(visibleCount)} в видимой области</span></div>
          <div className="map-keyboard-hint"><Keyboard size={15} /> WASD / стрелки · + / − · тачпад</div>
          <button className="locate-fab" title="Моё местоположение" aria-label="Показать моё местоположение" onClick={() => navigator.geolocation?.getCurrentPosition((value) => setFocusPosition([value.coords.latitude, value.coords.longitude]))}><Crosshair size={20} /></button>
        </div>
        {!user && <div className="signin-hint"><LocateFixed size={20} /><span><strong>Хотите добавить место?</strong> Войдите или зарегистрируйтесь — это займёт минуту.</span><button onClick={onAuth}>Войти</button></div>}
      </section>
    </main>
  )
}

function pointWord(value: number) {
  const mod100 = value % 100
  const mod10 = value % 10
  if (mod100 >= 11 && mod100 <= 14) return 'точек'
  if (mod10 === 1) return 'точка'
  if (mod10 >= 2 && mod10 <= 4) return 'точки'
  return 'точек'
}
