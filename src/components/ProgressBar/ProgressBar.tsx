import clsx from 'clsx'
import { useRef } from 'react'
import { CSSTransition } from 'react-transition-group'

interface ProgressBarProps {
  className?: string
  progress: number
}

export function ProgressBar({ className, progress }: ProgressBarProps) {
  progress = Math.max(5, progress)

  const ref = useRef<HTMLDivElement>(null)

  return (
    <CSSTransition
      in={progress < 100}
      nodeRef={ref}
      classNames={{
        enter: 'animate-fade-in',
        exit: 'animate-fade-out',
      }}
      timeout={2000}
      unmountOnExit
    >
      <div ref={ref} className={clsx('bg-slate-700 h-2 rounded-lg', className)} style={{ transitionDuration: '2000ms' }}>
        <div className="h-full bg-slate-300 transition-all animate-pulse" style={{ width: `${progress}%`, borderRadius: 'inherit', transitionDuration: '300ms' }} />
      </div>
    </CSSTransition>
  )
}
