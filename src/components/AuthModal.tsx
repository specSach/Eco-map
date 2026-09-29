import { Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { errorMessage } from '../api'

export function AuthModal({ onClose, onSuccess, initialMode = 'login' }: { onClose: () => void; onSuccess?: () => void; initialMode?: 'login' | 'register' }) {
  const { login } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email')).trim().toLowerCase()
    setPending(true)
    setError('')
    try {
      await login(mode, {
        email,
        password: String(data.get('password')),
        ...(mode === 'register' ? {
          firstName: String(data.get('firstName')).trim(),
          lastName: String(data.get('lastName')).trim(),
        } : {}),
      })
      onClose()
      onSuccess?.()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <div className="auth-icon"><LockKeyhole size={22} /></div>
        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Вход</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Регистрация</button>
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
            <span className="input-with-icon"><LockKeyhole size={17} /><input required minLength={mode === 'login' ? 1 : 8} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'login' ? 'Введите пароль' : 'Не менее 8 символов'} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-wide" type="submit" disabled={pending}>{pending ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Создать' : 'Войти'}</button>
        </div>
      </section>
    </div>
  )
}
