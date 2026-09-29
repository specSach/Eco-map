import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Clock3, ImagePlus, MapPin, Pencil, Trash2, UserRound, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { EcoMarker, WasteVolume } from '../types'
import { useStore } from '../store'

const volumeLabel: Record<WasteVolume, string> = { small: 'Немного', medium: 'Средне', large: 'Много' }

export function MarkerDrawer({ marker, onClose, onEdit }: { marker: EcoMarker; onClose: () => void; onEdit: (marker: EcoMarker) => void }) {
  const { user, requestCleanup, undoCleanup, confirmCleanup, addCleanupSlot, joinCleanupSlot } = useStore()
  const [proofOpen, setProofOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now())
  const isOwner = Boolean(user && marker.creatorEmail.toLowerCase() === user.email.toLowerCase())
  const activeSlots = marker.cleanupSlots.filter((slot) => new Date(slot.startsAt).getTime() > now)
  const reviewUntil = marker.cleanupRequest?.reviewUntil

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const act = (success: boolean, message: string) => {
    setNotice(success ? message : 'Действие недоступно для этого аккаунта.')
  }

  return <>
    <aside className="marker-drawer" role="dialog" aria-modal="true" aria-label={`Метка: ${marker.address}`}>
      <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
      <img className="drawer-photo" src={marker.photo} alt="Загрязнённое место" />
      <div className="drawer-content">
        <div className={`status-line marker-status-${marker.status}`}><span className={`volume-dot ${marker.status === 'active' ? marker.volume : 'gray'}`} /> {marker.status === 'active' ? `Объём: ${volumeLabel[marker.volume]}` : 'На проверке'}</div>
        <div className="drawer-title-row"><h2>{marker.address}</h2>{isOwner && <button className="edit-marker-button" onClick={() => onEdit(marker)}><Pencil size={15} /> Редактировать</button>}</div>
        <div className="category-list">{marker.categories.map((item) => <span key={item}>{item}</span>)}</div>
        <p className="drawer-description">{marker.description}</p>
        <div className="detail-grid">
          <div><CalendarDays size={18} /><span>Дата и время<small>{marker.date} МСК</small></span></div>
          <div><UserRound size={18} /><span>Добавил(а)<small>{marker.author}</small></span></div>
          <div><MapPin size={18} /><span>Координаты<small>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</small></span></div>
          <div><Clock3 size={18} /><span>Статус<small>{statusText(marker)}</small></span></div>
        </div>

        {marker.status === 'active' && <>
          <div className="drawer-notice"><Trash2 size={20} /><span><strong>{user ? 'Мусор уже убрали?' : 'Подтверждение доступно после входа'}</strong><small>{user ? 'Прикрепите фото — метка станет серой на 24 часа.' : 'Войдите, чтобы отправить фотографию уборки.'}</small></span></div>
          <button className="button button-wide" disabled={!user} onClick={() => setProofOpen(true)}><CheckCircle2 size={19} /> {user ? 'Кто-то убрал' : 'Войдите, чтобы сообщить'}</button>
        </>}

        {marker.status !== 'active' && reviewUntil && <section className="cleanup-review-card">
          <div className="cleanup-review-head"><Clock3 /><span><strong>На проверке</strong><small>До автоматического удаления: {formatRemaining(reviewUntil, now)}</small></span></div>
          {marker.cleanupRequest?.evidencePhoto && <img src={marker.cleanupRequest.evidencePhoto} alt="Фото после уборки" />}
          <p>{marker.cleanupRequest ? `Фото добавил(а) ${marker.cleanupRequest.requestedByName}. ` : ''}{isOwner ? 'Проверьте результат и подтвердите уборку либо верните метку в активные.' : 'Результат уборки ожидает решения автора метки.'}</p>
          {isOwner && <div className="cleanup-actions">
            <button className="button button-ghost" onClick={() => act(undoCleanup(marker.id), 'Метка снова активна, фото проверки удалено.')}><AlertTriangle size={17} /> Мусор не убран</button>
            <button className="button" onClick={() => act(confirmCleanup(marker.id), 'Уборка подтверждена, метка удалена.')}><CheckCircle2 size={17} /> Подтвердить</button>
          </div>}
        </section>}

        <section className="cleanup-planning">
          <div className="cleanup-planning-title"><Users size={20} /><div><strong>Групповая уборка</strong><small>{activeSlots.length ? `${activeSlots.length} ${slotWord(activeSlots.length)} запланировано` : 'Предложите удобные дату и время'}</small></div></div>
          {activeSlots.map((slot) => <div className="cleanup-slot" key={slot.id}><CalendarClock size={17} /><div><strong>{formatSlotDate(slot.startsAt)}</strong><small>{slot.participants.reduce((sum, participant) => sum + participant.peopleCount, 0)} чел. · создал(а) {slot.creatorName}</small></div></div>)}
          <button className="button button-ghost button-wide" disabled={!user} onClick={() => setPlanOpen((value) => !value)}><Users size={17} /> {user ? 'Я приду' : 'Войдите, чтобы записаться'}</button>
          {planOpen && user && <CleanupPlanForm marker={marker} onAdd={(startsAt, count) => { act(addCleanupSlot(marker.id, startsAt, count), 'Время уборки добавлено.'); setPlanOpen(false) }} onJoin={(slotId, count) => { act(joinCleanupSlot(marker.id, slotId, count), 'Вы записаны на уборку.'); setPlanOpen(false) }} />}
        </section>
        {notice && <button className="drawer-message" onClick={() => setNotice('')}>{notice}</button>}
      </div>
    </aside>
    {proofOpen && <CleanupProofModal onClose={() => setProofOpen(false)} onSubmit={(photo) => { act(requestCleanup(marker.id, photo), 'Метка переведена в статус «На проверке» на 24 часа.'); setProofOpen(false) }} />}
  </>
}

function CleanupProofModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (photo: string) => void }) {
  const [photo, setPhoto] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const choose = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Выберите изображение.'); return }
    const reader = new FileReader()
    reader.onload = () => { setPhoto(String(reader.result)); setError('') }
    reader.readAsDataURL(file)
  }
  return <div className="modal-backdrop cleanup-proof-backdrop" onMouseDown={onClose}><section className="cleanup-proof-modal" role="dialog" aria-modal="true" aria-labelledby="cleanup-proof-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button><p className="eyebrow">Проверка уборки</p><h2 id="cleanup-proof-title">Покажите результат уборки</h2><p className="muted">После отправки метка станет серой и автоматически исчезнет через 24 часа, если никто не нажмёт «Мусор не убран».</p><button type="button" className={`proof-upload${photo ? '' : ' empty'}`} onClick={() => fileRef.current?.click()}>{photo ? <img src={photo} alt="Фото после уборки" /> : <span><ImagePlus /> Выбрать фотографию</span>}</button><input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => choose(event.target.files?.[0])} />{error && <p className="field-error">{error}</p>}<button className="button button-wide" disabled={!photo} onClick={() => onSubmit(photo)}><CheckCircle2 size={18} /> Отправить на проверку</button></section></div>
}

function CleanupPlanForm({ marker, onAdd, onJoin }: { marker: EcoMarker; onAdd: (startsAt: string, count: number) => void; onJoin: (slotId: number, count: number) => void }) {
  const slots = marker.cleanupSlots.filter((slot) => new Date(slot.startsAt).getTime() > Date.now())
  const defaults = defaultCleanupTime()
  const [choice, setChoice] = useState('new')
  const [date, setDate] = useState(defaults.date)
  const [time, setTime] = useState(defaults.time)
  const [peopleCount, setPeopleCount] = useState(1)
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const count = Math.max(1, Math.min(100, peopleCount || 1))
    if (choice === 'new') {
      const startsAt = new Date(`${date}T${time}`)
      if (!date || !time || Number.isNaN(startsAt.getTime())) { setError('Укажите дату и время уборки.'); return }
      if (startsAt.getTime() <= Date.now()) { setError('Выберите время в будущем.'); return }
      setError('')
      onAdd(startsAt.toISOString(), count)
      return
    }
    if (!slots.some((slot) => String(slot.id) === choice)) { setError('Выберите доступное время.'); return }
    setError('')
    onJoin(Number(choice), count)
  }
  return <form className="cleanup-plan-form" onSubmit={submit} noValidate><fieldset><legend>Выберите время</legend><button type="button" className={choice === 'new' ? 'active' : ''} onClick={() => { setChoice('new'); setError('') }}><CalendarClock size={16} /><span>Новое время<small>Предложить дату и время</small></span></button>{slots.map((slot) => <button type="button" className={choice === String(slot.id) ? 'active' : ''} key={slot.id} onClick={() => { setChoice(String(slot.id)); setError('') }}><CalendarClock size={16} /><span>{formatSlotDate(slot.startsAt)}<small>{slot.participants.reduce((sum, participant) => sum + participant.peopleCount, 0)} чел. уже идут</small></span></button>)}</fieldset>{choice === 'new' && <div className="cleanup-date-time"><label>Дата<input required type="date" value={date} min={localDateValue(new Date())} onChange={(event) => setDate(event.target.value)} /></label><label>Время<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>}<label>Количество человек<input required type="number" min="1" max="100" value={peopleCount} onChange={(event) => setPeopleCount(Number(event.target.value))} /></label>{error && <p className="field-error" role="alert">{error}</p>}<button className="button button-wide" type="submit">{choice === 'new' ? 'Создать и записаться' : 'Записаться на это время'}</button></form>
}

function defaultCleanupTime() {
  const value = new Date(Date.now() + 60 * 60 * 1000)
  value.setMinutes(0, 0, 0)
  return { date: localDateValue(value), time: `${String(value.getHours()).padStart(2, '0')}:00` }
}

function localDateValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function statusText(marker: EcoMarker) {
  return marker.status === 'active' ? 'Ожидает уборки' : 'На проверке перед удалением'
}

function formatRemaining(date: string, now: number) {
  const remaining = Math.max(0, new Date(date).getTime() - now)
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatSlotDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

function slotWord(count: number) { return count === 1 ? 'время' : count > 1 && count < 5 ? 'времени' : 'времён' }
