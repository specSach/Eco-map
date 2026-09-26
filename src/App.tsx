import { useEffect, useState } from 'react'
import { AddMarkerModal } from './components/AddMarkerModal'
import { AuthModal } from './components/AuthModal'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { MarkerDrawer } from './components/MarkerDrawer'
import { HomePage } from './pages/HomePage'
import { MapPage } from './pages/MapPage'
import { ProfilePage } from './pages/ProfilePage'
import { StoreProvider, useStore } from './store'
import type { EcoMarker, Page } from './types'

const pageFromHash = (): Page => {
  const hash = location.hash.slice(1)
  return hash === 'map' || hash === 'profile' ? hash : 'home'
}

function Site() {
  const { clearMarker, user } = useStore()
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

  return <div className="app-shell">
    <Header page={page} onNavigate={navigate} onAuth={requestAuth} />
    {page === 'home' && <HomePage onNavigate={navigate} onSelect={setSelected} onAdd={requestAdd} />}
    {page === 'map' && <MapPage onAdd={requestAdd} onAuth={requestAuth} onSelect={setSelected} />}
    {page === 'profile' && <ProfilePage onLogout={() => navigate('home')} />}
    <Footer onNavigate={navigate} />
    {authOpen && <AuthModal initialMode={authIntent === 'add' ? 'register' : 'login'} onClose={() => { setAuthOpen(false); setAuthIntent(null) }} onSuccess={() => { if (authIntent === 'add') setAddOpen(true); setAuthIntent(null) }} />}
    {addOpen && <AddMarkerModal onClose={() => setAddOpen(false)} />}
    {selected && <><div className="drawer-backdrop" onClick={() => setSelected(null)} /><MarkerDrawer marker={selected} onClose={() => setSelected(null)} onClear={() => { clearMarker(selected.id); setSelected(null) }} /></>}
  </div>
}

export default function App() { return <StoreProvider><Site /></StoreProvider> }
