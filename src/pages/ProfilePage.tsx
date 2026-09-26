import { Check, KeyRound, LogOut, Mail, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../store'

export function ProfilePage({ onLogout }: { onLogout: () => void }) {
  const { user, updateUser, markers, logout } = useStore()
  const [notice, setNotice] = useState('')
  if (!user) return null
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    updateUser({ firstName: String(data.get('firstName')), lastName: String(data.get('lastName')), email: user.email })
    setNotice('Данные сохранены')
  }
  const savePassword = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); event.currentTarget.reset(); setNotice('Пароль успешно изменён') }
  const exit = () => { logout(); onLogout() }

  return (
    <main className="profile-page section-shell">
      <section className="profile-head"><div className="profile-avatar">{user.firstName[0]}{user.lastName[0]}</div><div><span className="eyebrow">Личный кабинет</span><h1>{user.firstName} {user.lastName}</h1><p><Mail size={15} /> {user.email}</p></div><button className="button button-ghost danger" onClick={exit}><LogOut size={17} /> Выйти</button></section>
      {notice && <button className="success-toast" onClick={() => setNotice('')}><Check size={17} /> {notice}</button>}
      <section className="profile-grid">
        <div className="settings-stack">
          <article className="settings-card"><div className="settings-title"><span><UserRound /></span><div><h2>Личные данные</h2><p>Имя отображается у добавленных вами точек</p></div></div><form onSubmit={saveProfile} className="form-stack"><div className="form-row"><label>Имя<input required name="firstName" defaultValue={user.firstName} /></label><label>Фамилия<input required name="lastName" defaultValue={user.lastName} /></label></div><label>Электронная почта<input disabled value={user.email} /></label><button className="button align-self" type="submit"><Save size={17} /> Сохранить</button></form></article>
          <article className="settings-card"><div className="settings-title"><span><KeyRound /></span><div><h2>Изменить пароль</h2><p>Подтверждение по почте не потребуется</p></div></div><form onSubmit={savePassword} className="form-stack"><label>Текущий пароль<input required type="password" minLength={6} placeholder="Введите текущий пароль" /></label><div className="form-row"><label>Новый пароль<input required type="password" minLength={6} placeholder="Не менее 6 символов" /></label><label>Повторите пароль<input required type="password" minLength={6} placeholder="Ещё раз" /></label></div><button className="button align-self" type="submit"><ShieldCheck size={17} /> Обновить пароль</button></form></article>
        </div>
        <aside className="profile-aside"><article className="profile-stat"><div className="stat-icon"><MapPin /></div><strong>{markers.filter((m) => m.author.startsWith(user.firstName)).length}</strong><span>точек добавлено вами</span></article><article className="profile-tip"><span>🌱</span><h3>Спасибо за участие!</h3><p>Каждая отметка помогает другим быстрее найти место и сделать его чище.</p></article></aside>
      </section>
    </main>
  )
}
