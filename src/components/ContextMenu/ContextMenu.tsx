import clsx from 'clsx'
import { MouseEvent, ReactElement, cloneElement, useEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  destructive?: boolean
  onClick(): void
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  disabled?: boolean
  children: ReactElement
}

export function ContextMenu({ items, disabled = false, children }: ContextMenuProps) {
  const [position, setPosition] = useState<{ left: number, top: number }>()
  const menuRef = useRef<HTMLDivElement>(null)

  function openMenu(e: MouseEvent) {
    if (disabled) return

    e.preventDefault()
    e.stopPropagation()
    setPosition({
      left: Math.min(e.clientX, window.innerWidth - 160),
      top: Math.min(e.clientY, window.innerHeight - 96),
    })
  }

  useEffect(() => {
    if (!position) return

    const controller = new AbortController()
    const closeMenu = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node))
        setPosition(undefined)
    }
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPosition(undefined)
    }

    document.addEventListener('pointerdown', closeMenu, { signal: controller.signal })
    document.addEventListener('keydown', closeOnEscape, { signal: controller.signal })

    return () => controller.abort()
  }, [position])

  const trigger = cloneElement(children, {
    onContextMenu: (e: MouseEvent) => {
      children.props.onContextMenu?.(e)
      openMenu(e)
    },
  })

  return (
    <>
      {trigger}
      {position && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-20 min-w-36 border border-zinc-600 bg-zinc-900 py-1 shadow-lg"
          style={position}
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={clsx('block w-full bg-transparent px-3 py-1.5 text-left hover:bg-zinc-700', item.destructive && 'text-red-400')}
              onClick={() => {
                setPosition(undefined)
                item.onClick()
              }}
            >{item.label}</button>
          ))}
        </div>
      )}
    </>
  )
}
