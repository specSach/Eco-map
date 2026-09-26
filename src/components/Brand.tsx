import { Leaf } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Эко карта">
      <span className="brand-mark"><Leaf size={compact ? 18 : 21} strokeWidth={2.5} /></span>
      <span className={compact ? 'text-[17px]' : ''}>Эко карта</span>
    </div>
  )
}
