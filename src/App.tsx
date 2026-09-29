import { lazy, Suspense, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { StoreProvider, useStore } from './store'
import type { EcoMarker, Page } from './types'

const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const AuthModal = lazy(() => import('./components/AuthModal').then((module) => ({ default: module.AuthModal })))
const AddMarkerModal = lazy(() => import('./components/AddMarkerModal').then((module) => ({ default: module.AddMarkerModal })))
const MarkerDrawer = lazy(() => import('./components/MarkerDrawer').then((module) => ({ default: module.MarkerDrawer })))

const pageFromHash = (): Page => {
  const hash = location.hash.slice(1)
  return hash === 'map' || hash === 'profile' ? hash : 'home'
}

function Site() {
  const { clearMarker, user, error, clearError } = useStore()
  const [page, setPage] = useState<Page>(pageFromHash)
  const [authOpen, setAuthOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [authIntent, setAuthIntent] = useState<'add' | null>(null)
  const [selected, setSelected] = useState<EcoMarker | null>(null)
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
    }
    const current = metadata[page]
    document.title = current.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', current.description)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', current.robots)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', current.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', current.description)
  }, [page])

  return <div className="app-shell">
    {error && <button className="api-error-banner" onClick={clearError} role="alert">{error} · Закрыть</button>}
    <Header page={page} onNavigate={navigate} onAuth={requestAuth} />
    <Suspense fallback={<main className="page-loading" aria-label="Страница загружается"><span /></main>}>
      {page === 'home' && <HomePage onNavigate={navigate} onSelect={setSelected} onAdd={requestAdd} />}
      {page === 'map' && <MapPage onAdd={requestAdd} onAuth={requestAuth} onSelect={setSelected} />}
      {page === 'profile' && <ProfilePage onLogout={() => navigate('home')} />}
    </Suspense>
    <Footer onNavigate={navigate} />
    <Suspense fallback={null}>
      {authOpen && <AuthModal initialMode={authIntent === 'add' ? 'register' : 'login'} onClose={() => { setAuthOpen(false); setAuthIntent(null) }} onSuccess={() => { if (authIntent === 'add') setAddOpen(true); setAuthIntent(null) }} />}
      {addOpen && <AddMarkerModal onClose={() => setAddOpen(false)} />}
      {selected && <><div className="drawer-backdrop" onClick={() => setSelected(null)} /><MarkerDrawer marker={selected} onClose={() => setSelected(null)} onClear={() => { void clearMarker(selected.id).then(() => setSelected(null)).catch(() => undefined) }} /></>}
    </Suspense>
  </div>
}

export default function App() { return <StoreProvider><Site /></StoreProvider> }
