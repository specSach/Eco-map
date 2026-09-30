import { Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api'
import { useStore } from '../store'

export function AuthModal({ onClose, onSuccess, initialMode = 'login' }: { onClose: () => void; onSuccess?: () => void; initialMode?: 'login' | 'register' }) {
  const { login } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setPending(true)
    setError('')
    try {
      await login(mode, {
        email: String(data.get('email')).trim().toLowerCase(),
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
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        <div className="auth-icon"><LockKeyhole size={22} /></div>
        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Войти</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Регистрация</button>
        </div>
        <h2 id="auth-title">{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h2>
        <p className="muted">{mode === 'login' ? 'Войдите, чтобы добавлять метки и участвовать в уборках.' : 'Заполните данные — подтверждение по почте не потребуется.'}</p>
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          {mode === 'register' && <div className="form-row">
            <label>Имя<input required name="firstName" autoComplete="given-name" /></label>
            <label>Фамилия<input required name="lastName" autoComplete="family-name" /></label>
          </div>}
          <label>Электронная почта
            <span className="input-with-icon"><Mail size={17} /><input required name="email" type="email" autoComplete="email" placeholder="name@example.ru" /></span>
          </label>
          <label>Пароль
            <span className="input-with-icon"><LockKeyhole size={17} /><input required minLength={mode === 'register' ? 8 : 1} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'register' ? 'Не менее 8 символов' : 'Введите пароль'} /><button type="button" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-wide" type="submit" disabled={pending}>{pending ? 'Отправляем…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? 'Ещё нет аккаунта?' : 'Уже есть аккаунт?'}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Создать' : 'Войти'}</button>
        </div>
      </section>
    </div>
  )
}
