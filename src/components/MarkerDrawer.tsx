import { CalendarDays, CheckCircle2, Clock3, MapPin, Trash2, UserRound, X } from 'lucide-react'
import type { EcoMarker, WasteVolume } from '../types'
import { useStore } from '../store'

const volumeLabel: Record<WasteVolume, string> = { small: 'Немного', medium: 'Средне', large: 'Много' }

export function MarkerDrawer({ marker, onClose, onClear }: { marker: EcoMarker; onClose: () => void; onClear: () => void }) {
  const { user } = useStore()
  return (
    <aside className="marker-drawer">
      <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
      <img className="drawer-photo" src={marker.photo} alt="Загрязнённое место" />
      <div className="drawer-content">
        <div className="status-line"><span className={`volume-dot ${marker.volume}`} /> Объём: {volumeLabel[marker.volume]}</div>
        <h2>{marker.address}</h2>
        <div className="category-list">{marker.categories.map((item) => <span key={item}>{item}</span>)}</div>
        <p className="drawer-description">{marker.description}</p>
        <div className="detail-grid">
          <div><CalendarDays size={18} /><span>Дата и время<small>{marker.date} МСК</small></span></div>
          <div><UserRound size={18} /><span>Добавил(а)<small>{marker.author}</small></span></div>
          <div><MapPin size={18} /><span>Координаты<small>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</small></span></div>
          <div><Clock3 size={18} /><span>Статус<small>Ожидает уборки</small></span></div>
        </div>
        <div className="drawer-notice"><Trash2 size={20} /><span><strong>{user ? 'Вы уже убрали мусор?' : 'Подтверждение доступно после входа'}</strong><small>{user ? 'Спасибо! После подтверждения точка исчезнет с карты.' : 'Зарегистрируйтесь или войдите, чтобы менять статус точки.'}</small></span></div>
        <button className="button button-wide" disabled={!user} onClick={onClear}><CheckCircle2 size={19} /> {user ? 'Отметить как убранное' : 'Войдите, чтобы отметить убранным'}</button>
      </div>
    </aside>
  )
}
