import { Camera, Crosshair, ImagePlus, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../api'
import { categories } from '../data'
import { useStore } from '../store'
import type { EcoMarker, MapView, WasteVolume } from '../types'
import { LazyEcoMap } from './LazyEcoMap'

const defaultPhoto = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80'

export function AddMarkerModal({ onClose, marker, initialMapView }: { onClose: () => void; marker?: EcoMarker | null; initialMapView: MapView }) {
  const { addMarker, updateMarker } = useStore()
  const initialPosition: [number, number] = marker ? [marker.lat, marker.lng] : initialMapView.center
  const [position, setPosition] = useState<[number, number]>(initialPosition)
  const [focusPosition, setFocusPosition] = useState<[number, number]>()
  const [selected, setSelected] = useState<string[]>(marker?.categories ?? ['Пластик'])
  const [volume, setVolume] = useState<WasteVolume>(marker?.volume ?? 'small')
  const [photo, setPhoto] = useState(marker?.photo ?? defaultPhoto)
  const [photoFile, setPhotoFile] = useState<File>()
  const [address, setAddress] = useState(marker?.address ?? `Координаты: ${initialPosition[0].toFixed(5)}, ${initialPosition[1].toFixed(5)}`)
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose, pending])

  useEffect(() => () => {
    if (photo.startsWith('blob:')) URL.revokeObjectURL(photo)
  }, [photo])

  const selectPosition = (nextPosition: [number, number], focus = false) => {
    setPosition(nextPosition)
    if (focus) setFocusPosition(nextPosition)
    setAddress(`Координаты: ${nextPosition[0].toFixed(5)}, ${nextPosition[1].toFixed(5)}`)
  }

  const locate = () => navigator.geolocation?.getCurrentPosition((value) => {
    selectPosition([value.coords.latitude, value.coords.longitude], true)
  })

  const geocode = async () => {
    if (!address.trim()) return
    setSearchState('loading')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, { headers: { 'Accept-Language': 'ru' } })
      if (!response.ok) throw new Error('not found')
      const [result] = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!result) throw new Error('not found')
      const foundPosition: [number, number] = [Number(result.lat), Number(result.lon)]
      setPosition(foundPosition)
      setFocusPosition(foundPosition)
      setAddress(result.display_name)
      setSearchState('idle')
    } catch {
      setSearchState('error')
    }
  }

  const upload = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setSubmitError('Выберите изображение.'); return }
    if (file.size > 8 * 1024 * 1024) { setSubmitError('Размер фотографии не должен превышать 8 МБ.'); return }
    setPhoto((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setPhotoFile(file)
    setSubmitError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const draft = {
      lat: position[0], lng: position[1], address: address.trim(), categories: selected, volume, photo,
      description: String(data.get('description') || 'Описание не добавлено.').trim() || 'Описание не добавлено.',
    }
    setPending(true); setSubmitError('')
    try {
      if (marker) {
        const success = await updateMarker(marker.id, draft, photoFile)
        if (!success) { setSubmitError('Не удалось сохранить изменения. Проверьте права доступа и соединение.'); return }
      } else {
        await addMarker(draft, photoFile)
      }
      onClose()
    } catch (reason) {
      setSubmitError(errorMessage(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="modal-backdrop marker-modal-backdrop" onMouseDown={() => { if (!pending) onClose() }}>
      <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="marker-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="add-modal-header">
          <div><p className="eyebrow">{marker ? 'Редактирование' : 'Новая точка'}</p><h2 id="marker-form-title">{marker ? 'Изменить метку' : 'Отметить мусор'}</h2></div>
          <button className="modal-close static" onClick={onClose} disabled={pending} aria-label="Закрыть"><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="add-form">
          <div className="add-fields">
            <div className="field-group">
              <div className="field-heading"><span>1</span><div><strong>Где находится мусор?</strong><small>Найдите адрес или укажите точку на карте</small></div></div>
              <label className="search-input"><Search size={18} /><input required value={address} onChange={(event) => { setAddress(event.target.value); setSearchState('idle') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void geocode() } }} placeholder="Введите адрес" /><button type="button" onClick={() => void geocode()}>{searchState === 'loading' ? 'Ищем…' : 'Найти'}</button><button type="button" onClick={locate}><LocateFixed size={18} /> <span>Я здесь</span></button></label>
              {searchState === 'error' && <p className="field-error">Не нашли этот адрес. Уточните запрос или поставьте точку вручную.</p>}
            </div>
            <div className="field-group">
              <div className="field-heading"><span>2</span><div><strong>Что здесь лежит?</strong><small>Можно выбрать несколько категорий</small></div></div>
              <div className="choice-wrap">{categories.map((item) => <button key={item} type="button" aria-pressed={selected.includes(item)} className={selected.includes(item) ? 'choice active' : 'choice'} onClick={() => setSelected((list) => list.includes(item) ? list.filter((value) => value !== item) : [...list, item])}>{item}</button>)}</div>
            </div>
            <div className="field-group">
              <div className="field-heading"><span>3</span><div><strong>Какой объём?</strong><small>Оцените количество мусора</small></div></div>
              <div className="volume-options">{([['small', 'Немного', 'Поместится в один пакет'], ['medium', 'Средне', 'Понадобится 2–3 пакета'], ['large', 'Много', 'Нужна помощь команды']] as const).map(([value, title, caption]) => <button type="button" key={value} aria-pressed={volume === value} className={volume === value ? 'volume-option active' : 'volume-option'} onClick={() => setVolume(value)}><span className={`volume-dot ${value}`} /><span><strong>{title}</strong><small>{caption}</small></span></button>)}</div>
            </div>
            <div className="field-group field-split">
              <div><div className="field-heading"><span>4</span><div><strong>Добавьте фото</strong><small>Так место будет проще найти</small></div></div><button type="button" className="photo-upload" onClick={() => fileRef.current?.click()}><img src={photo} alt="Предпросмотр" /><span><ImagePlus size={20} /> Заменить фото</span></button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} /></div>
              <label>Комментарий<textarea name="description" rows={4} defaultValue={marker?.description ?? ''} placeholder="Опишите ориентиры и что лежит рядом..." /></label>
            </div>
          </div>
          <div className="picker-panel">
            <div className="picker-title"><MapPin size={18} /><span><strong>Укажите точку на карте</strong><small>Нажмите в нужном месте</small></span></div>
            <LazyEcoMap eager pickerPosition={position} pickerVolume={volume} onPositionChange={selectPosition} center={initialPosition} zoom={marker ? 14 : initialMapView.zoom} focusPosition={focusPosition} focusZoom={15} onEscape={onClose} />
            <div className="coords"><Crosshair size={16} /> {position[0].toFixed(5)}, {position[1].toFixed(5)}</div>
            {submitError && <p className="field-error" role="alert">{submitError}</p>}
            <button className="button button-wide" type="submit" disabled={!selected.length || pending}>{pending ? 'Сохраняем…' : <><Camera size={18} /> {marker ? 'Сохранить изменения' : 'Добавить точку'}</>}</button>
            <p className="form-consent">Публикуя точку, вы подтверждаете корректность данных</p>
          </div>
        </form>
      </section>
    </div>
  )
}
