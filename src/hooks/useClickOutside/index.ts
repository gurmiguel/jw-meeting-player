import { useEffect, useRef } from 'react'

export function useClickOutside<E extends HTMLElement>(handler: (e: MouseEvent) => void, disable = false) {
  const ref = useRef<E>(null)

  useEffect(() => {
    if (disable) return

    function onDocumentClick(e: MouseEvent) {
      if (!ref.current) return

      let currentNode = e.target as HTMLElement | null
      while (currentNode !== null) {
        if (currentNode.isEqualNode(ref.current))
          return

        currentNode = currentNode.parentElement
      }
      handler(e)
    }

    setTimeout(() => {
      document.addEventListener('click', onDocumentClick)
    })
    return () => document.removeEventListener('click', onDocumentClick)
  }, [disable, handler])

  return ref
}
