import type { PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

export function GlassPanel({
  children,
  className,
  ...props
}: PropsWithChildren<{ className?: string } & React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn('glass-panel', className)} {...props}>{children}</div>
}
