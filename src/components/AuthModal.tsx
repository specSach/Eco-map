import { Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../store'

export function AuthModal({ onClose, onSuccess, initialMode = 'login' }: { onClose: () => void; onSuccess?: () => void; initialMode?: 'login' | 'register' }) {
  const { authenticate, register } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email')).trim().toLowerCase()
    const password = String(data.get('password'))
    let success = false
    if (mode === 'register') {
      success = await register({
        firstName: String(data.get('firstName')).trim(),
        lastName: String(data.get('lastName')).trim(),
        email,
      }, password)
      if (!success) { setError('Аккаунт с этой почтой уже существует. Войдите в него.'); return }
    } else {
      success = await authenticate(email, password)
      if (!success) { setError('Аккаунт не найден или пароль указан неверно.'); return }
    }
    onClose()
    onSuccess?.()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <div className="auth-icon"><LockKeyhole size={22} /></div>
        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Вход</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Регистрация</button>
        </div>
        <p className="eyebrow">Добро пожаловать</p>
        <h2>{mode === 'login' ? 'Войти в Эко карту' : 'Создать аккаунт'}</h2>
        <p className="muted">{mode === 'login' ? 'Продолжайте делать город чище вместе с нами.' : 'Пара минут — и можно добавлять новые точки.'}</p>
        <form onSubmit={(event) => void submit(event)} className="form-stack">
          {mode === 'register' && (
            <div className="form-row">
              <label>Имя<input required name="firstName" autoComplete="given-name" placeholder="Ваше имя" /></label>
              <label>Фамилия<input required name="lastName" autoComplete="family-name" placeholder="Ваша фамилия" /></label>
            </div>
          )}
          <label>Электронная почта
            <span className="input-with-icon"><Mail size={17} /><input required name="email" type="email" autoComplete="email" placeholder="name@example.ru" /></span>
          </label>
          <label>Пароль
            <span className="input-with-icon"><LockKeyhole size={17} /><input required minLength={6} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder="Не менее 6 символов" /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-wide" type="submit">{mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Создать' : 'Войти'}</button>
        </div>
      </section>
    </div>
  )
}
