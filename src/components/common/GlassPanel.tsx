import type { PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

export function GlassPanel({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('glass-panel', className)}>{children}</div>
}
