import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export const drawerEase = [0.22, 1, 0.36, 1] as const

export const drawerBackdropClassName = 'fixed inset-0 z-40 bg-black/[0.14]'

const drawerExitEase = [0.4, 0, 1, 1] as const

export const drawerBackdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: drawerEase } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: drawerExitEase } },
} as const

export const drawerPaperVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: drawerEase },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.5, ease: drawerExitEase },
  },
} as const

export const drawerStackVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.06 },
  },
} as const

export const drawerSectionVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: drawerEase },
  },
} as const

export function DrawerStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={drawerStackVariants} className={className}>
      {children}
    </motion.div>
  )
}

export function DrawerSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div data-testid="cascade-item" variants={drawerSectionVariants} className={className}>
      {children}
    </motion.div>
  )
}
