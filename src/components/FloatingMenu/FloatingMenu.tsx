import { SquaresPlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'
import { BibleWidget } from '../Bible/BibleWidget'
import { CleaningWidget } from '../Cleaning/CleaningWidget'

export function FloatingMenu() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className={clsx('fixed z-10 bottom-4 left-4 flex pt-4 min-w-[200px]', { 'pointer-events-none': !menuOpen })} onMouseLeave={() => setMenuOpen(false)}>
        <button
          type="button"
          title="Abrir menu de ações"
          className="floating-icon-button pointer-events-auto"
          onMouseOver={() => setMenuOpen(true)}
        >
          <SquaresPlusIcon className="h-8" />
        </button>

        <div className={clsx('absolute bottom-[100%] left-0 flex flex-col-reverse gap-2', { 'hidden': !menuOpen })}>
          <BibleWidget />
          <CleaningWidget />
        </div>
      </div>
    </>
  )
}
