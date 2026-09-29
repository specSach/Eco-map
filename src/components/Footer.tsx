import { Code2, Heart } from 'lucide-react'
import type { Page } from '../types'
import { Brand } from './Brand'

export function Footer({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-intro"><Brand compact /><p>Помогаем людям замечать проблемы и вместе делать города чище.</p></div>
        <div><strong>Навигация</strong><button onClick={() => onNavigate('home')}>Главная</button><button onClick={() => onNavigate('map')}>Карта</button></div>
        <div><strong>Проект</strong><button onClick={() => onNavigate('privacy')}>Политика конфиденциальности</button><a href="https://github.com/specSach/Eco-map" target="_blank" rel="noreferrer"><Code2 size={15} /> Проект на GitHub</a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Эко карта</span><span>Сделано с <Heart size={14} fill="currentColor" /> для чистого города</span></div>
    </footer>
  )
}
