import { Camera, Crosshair, ImagePlus, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { categories } from '../data'
import { useStore } from '../store'
import type { WasteVolume } from '../types'
import { LazyEcoMap } from './LazyEcoMap'

const defaultPhoto = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80'

export function AddMarkerModal({ onClose }: { onClose: () => void }) {
  const { addMarker } = useStore()
  const [position, setPosition] = useState<[number, number]>([55.7558, 37.6176])
  const [selected, setSelected] = useState<string[]>(['Пластик'])
  const [volume, setVolume] = useState<WasteVolume>('small')
  const [photo, setPhoto] = useState(defaultPhoto)
  const [address, setAddress] = useState('Москва, центр')
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  const locate = () => {
    navigator.geolocation?.getCurrentPosition((value) => {
      setPosition([value.coords.latitude, value.coords.longitude])
      setAddress('Моя текущая геопозиция')
    })
  }
  const geocode = async () => {
    if (!address.trim()) return
    setSearchState('loading')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, { headers: { 'Accept-Language': 'ru' } })
      const [result] = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!result) throw new Error('not found')
      setPosition([Number(result.lat), Number(result.lon)])
      setAddress(result.display_name)
      setSearchState('idle')
    } catch {
      setSearchState('error')
    }
  }
  const upload = (file?: File) => {
    if (file) setPhoto(URL.createObjectURL(file))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget as HTMLFormElement)
    addMarker({
      lat: position[0], lng: position[1], address, categories: selected, volume, photo,
      description: String(data.get('description') || 'Описание не добавлено.'),
    })
    onClose()
  }

  return (
    <div className="modal-backdrop marker-modal-backdrop" onMouseDown={onClose}>
      <section className="add-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="add-modal-header">
          <div><p className="eyebrow">Новая точка</p><h2>Отметить мусор</h2></div>
          <button className="modal-close static" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </header>
        <form onSubmit={submit} className="add-form">
          <div className="add-fields">
            <div className="field-group">
              <div className="field-heading"><span>1</span><div><strong>Где находится мусор?</strong><small>Найдите адрес или укажите точку на карте</small></div></div>
              <label className="search-input"><Search size={18} /><input required value={address} onChange={(e) => { setAddress(e.target.value); setSearchState('idle') }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void geocode() } }} placeholder="Введите адрес" /><button type="button" onClick={() => void geocode()}>{searchState === 'loading' ? 'Ищем…' : 'Найти'}</button><button type="button" onClick={locate}><LocateFixed size={18} /> <span>Я здесь</span></button></label>
              {searchState === 'error' && <p className="field-error">Не нашли этот адрес. Уточните запрос или поставьте точку вручную.</p>}
            </div>
            <div className="field-group">
              <div className="field-heading"><span>2</span><div><strong>Что здесь лежит?</strong><small>Можно выбрать несколько категорий</small></div></div>
              <div className="choice-wrap">{categories.map((item) => <button key={item} type="button" className={selected.includes(item) ? 'choice active' : 'choice'} onClick={() => setSelected((list) => list.includes(item) ? list.filter((x) => x !== item) : [...list, item])}>{item}</button>)}</div>
            </div>
            <div className="field-group">
              <div className="field-heading"><span>3</span><div><strong>Какой объём?</strong><small>Оцените количество мусора</small></div></div>
              <div className="volume-options">
                {([['small', 'Немного', 'Поместится в один пакет'], ['medium', 'Средне', 'Понадобится 2–3 пакета'], ['large', 'Много', 'Нужна помощь команды']] as const).map(([value, title, caption]) => (
                  <button type="button" key={value} className={volume === value ? 'volume-option active' : 'volume-option'} onClick={() => setVolume(value)}><span className={`volume-dot ${value}`} /><span><strong>{title}</strong><small>{caption}</small></span></button>
                ))}
              </div>
            </div>
            <div className="field-group field-split">
              <div>
                <div className="field-heading"><span>4</span><div><strong>Добавьте фото</strong><small>Так место будет проще найти</small></div></div>
                <button type="button" className="photo-upload" onClick={() => fileRef.current?.click()}><img src={photo} alt="Предпросмотр" /><span><ImagePlus size={20} /> Заменить фото</span></button>
                <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
              </div>
              <label>Комментарий<textarea name="description" rows={4} placeholder="Опишите ориентиры и что лежит рядом..." /></label>
            </div>
          </div>
          <div className="picker-panel">
            <div className="picker-title"><MapPin size={18} /><span><strong>Укажите точку на карте</strong><small>Нажмите в нужном месте</small></span></div>
            <LazyEcoMap eager pickerPosition={position} pickerVolume={volume} onPositionChange={setPosition} center={position} zoom={14} />
            <div className="coords"><Crosshair size={16} /> {position[0].toFixed(5)}, {position[1].toFixed(5)}</div>
            <button className="button button-wide" type="submit" disabled={!selected.length}><Camera size={18} /> Добавить точку</button>
            <p className="form-consent">Публикуя точку, вы подтверждаете корректность данных</p>
          </div>
        </form>
      </section>
    </div>
  )
}
