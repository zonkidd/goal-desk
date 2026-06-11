import type { PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

export function GlassCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('glass-card', className)}>{children}</div>
}
