import { lazy, Suspense, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { StoreProvider, useStore } from './store'
import type { EcoMarker, Page } from './types'

const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })))
const AuthModal = lazy(() => import('./components/AuthModal').then((module) => ({ default: module.AuthModal })))
const AddMarkerModal = lazy(() => import('./components/AddMarkerModal').then((module) => ({ default: module.AddMarkerModal })))
const MarkerDrawer = lazy(() => import('./components/MarkerDrawer').then((module) => ({ default: module.MarkerDrawer })))

const pageFromHash = (): Page => {
  const hash = location.hash.slice(1)
  return hash === 'map' || hash === 'profile' || hash === 'privacy' ? hash : 'home'
}

function Site() {
  const { markers, user } = useStore()
  const [page, setPage] = useState<Page>(pageFromHash)
  const [authOpen, setAuthOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [authIntent, setAuthIntent] = useState<'add' | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<EcoMarker | null>(null)
  const selected = selectedId === null ? null : markers.find((marker) => marker.id === selectedId) ?? null
  const navigate = (next: Page) => { setPage(next); location.hash = next; window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const requestAdd = () => {
    if (user) setAddOpen(true)
    else { setAuthIntent('add'); setAuthOpen(true) }
  }
  const requestAuth = () => { setAuthIntent(null); setAuthOpen(true) }
  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash())
      if (location.hash === '#how') requestAnimationFrame(() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }))
    }
    addEventListener('hashchange', onHash)
    onHash()
    return () => removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { document.body.style.overflow = authOpen || addOpen || selected ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [authOpen, addOpen, selected])
  useEffect(() => {
    const metadata: Record<Page, { title: string; description: string; robots: string }> = {
      home: {
        title: 'Эко карта — интерактивная карта загрязнений',
        description: 'Находите загрязнённые места, добавляйте метки мусора и помогайте делать города России и Европы чище.',
        robots: 'index, follow, max-image-preview:large',
      },
      map: {
        title: 'Карта загрязнений и мусора — Эко карта',
        description: 'Интерактивная экологическая карта загрязнений: фотографии, категории и объём мусора, геолокация и поиск города.',
        robots: 'index, follow, max-image-preview:large',
      },
      profile: {
        title: 'Личный кабинет — Эко карта',
        description: 'Управление профилем пользователя Эко карты.',
        robots: 'noindex, nofollow',
      },
      privacy: {
        title: 'Политика конфиденциальности — Эко карта',
        description: 'Как Эко карта использует и защищает данные пользователей, фотографии и геолокацию.',
        robots: 'index, follow',
      },
    }
    const current = metadata[page]
    document.title = current.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', current.description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', current.robots)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', current.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', current.description)
  }, [page])

  return <div className="app-shell">
    <Header page={page} onNavigate={navigate} onAuth={requestAuth} />
    <Suspense fallback={<main className="page-loading" aria-label="Страница загружается"><span /></main>}>
      {page === 'home' && <HomePage onNavigate={navigate} onSelect={(marker) => setSelectedId(marker.id)} onAdd={requestAdd} />}
      {page === 'map' && <MapPage onAdd={requestAdd} onAuth={requestAuth} onSelect={(marker) => setSelectedId(marker.id)} />}
      {page === 'profile' && <ProfilePage onLogout={() => navigate('home')} />}
      {page === 'privacy' && <PrivacyPage />}
    </Suspense>
    <Footer onNavigate={navigate} />
    <Suspense fallback={null}>
      {authOpen && <AuthModal initialMode={authIntent === 'add' ? 'register' : 'login'} onClose={() => { setAuthOpen(false); setAuthIntent(null) }} onSuccess={() => { if (authIntent === 'add') setAddOpen(true); setAuthIntent(null) }} />}
      {addOpen && <AddMarkerModal marker={editing} onClose={() => { setAddOpen(false); setEditing(null) }} />}
      {selected && <><div className="drawer-backdrop" onClick={() => setSelectedId(null)} /><MarkerDrawer marker={selected} onClose={() => setSelectedId(null)} onEdit={(marker) => { setSelectedId(null); setEditing(marker); setAddOpen(true) }} /></>}
    </Suspense>
  </div>
}

export default function App() { return <StoreProvider><Site /></StoreProvider> }
