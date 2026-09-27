import { lazy, Suspense, useEffect, useState } from 'react'
import type { EcoMapProps } from './EcoMap'

const EcoMap = lazy(() => import('./EcoMap').then((module) => ({ default: module.EcoMap })))

export function LazyEcoMap({ eager = false, className = '', ...props }: EcoMapProps & { eager?: boolean }) {
  const [ready, setReady] = useState(eager)

  useEffect(() => {
    if (eager) return
    const timer = window.setTimeout(() => setReady(true), 250)
    return () => window.clearTimeout(timer)
  }, [eager])

  const placeholder = <div className={`eco-map map-skeleton ${className}`} role="status" aria-label="Карта загружается" />
  if (!ready) return placeholder

  return <Suspense fallback={placeholder}><EcoMap {...props} className={className} /></Suspense>
}
