import { LogIn, Map, Menu, Moon, Sun, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import type { Page } from '../types'
import { useStore } from '../store'
import { Brand } from './Brand'

type Props = {
  page: Page
  onNavigate: (page: Page) => void
  onAuth: () => void
}

export function Header({ page, onNavigate, onAuth }: Props) {
  const { dark, setDark, user } = useStore()
  const [open, setOpen] = useState(false)
  const go = (next: Page) => { onNavigate(next); setOpen(false) }

  return (
    <header className="site-header">
      <button className="unstyled" onClick={() => go('home')}><Brand /></button>
      <nav className={open ? 'nav open' : 'nav'} aria-label="Основная навигация">
        <button className={page === 'home' ? 'active' : ''} onClick={() => go('home')}>Главная</button>
        <button className={page === 'map' ? 'active' : ''} onClick={() => go('map')}><Map size={16} /> Карта</button>
        {user && <button className={page === 'profile' ? 'active' : ''} onClick={() => go('profile')}><UserRound size={16} /> Кабинет</button>}
      </nav>
      <div className="header-actions">
        <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Переключить тему">
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        {user ? (
          <button className="avatar-button" onClick={() => go('profile')} title="Личный кабинет">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </button>
        ) : (
          <button className="button button-small" onClick={onAuth}><LogIn size={17} /> Войти</button>
        )}
        <button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Открыть меню">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}
