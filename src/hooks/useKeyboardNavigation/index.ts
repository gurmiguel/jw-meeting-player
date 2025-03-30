import { useEffect, useMemo, useRef } from 'react'
import { SPEED_OPTIONS } from '../../../shared/constants'
import { MediaTypes } from '../../../shared/models/MediaTypes'
import { useAppDispatch, useAppStore } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'

type Axis = 'x' | 'y'

export function useKeyboardNavigation() {
  const store = useAppStore()
  const dispatch = useAppDispatch()

  const groupFocusMemory = useRef<Map<HTMLElement, HTMLElement>>(new Map())

  const arrowHandlers = useMemo(() => {
    type GenericHandler = (element: HTMLElement, target: 'prev' | 'next') => boolean

    const horizontal: GenericHandler = (element, target) => {
      const elements = getFocusableElements('[data-arrow-nav*="x"]')

      const targetDelta: Record<typeof target, number> = {
        'prev': -1,
        'next': +1,
      }

      const currentIndex = elements.indexOf(element)
      const targetIndex = target === 'next' && currentIndex + 1 >= elements.length
        ? 0
        : currentIndex + targetDelta[target]

      elements.at(targetIndex)?.focus()

      return true
    }

    const vertical: GenericHandler = (element, target) => {
      const group = element.closest<HTMLElement>('[data-arrow-nav="group"]')

      if (!group) {
        return {
          'prev': arrowHandlers.ArrowLeft,
          'next': arrowHandlers.ArrowRight,
        }[target](element, ['y'])
      }

      const groups = document.querySelectorAll<HTMLElement>('[data-arrow-nav="group"]').values().toArray()

      const targetDelta: Record<typeof target, number> = {
        'prev': -1,
        'next': +1,
      }

      const currentIndex = groups.indexOf(group)
      const targetIndex = target === 'next' && currentIndex + 1 >= groups.length
        ? 0
        : currentIndex + targetDelta[target]

      const targetGroup = groups.at(targetIndex)

      if (!targetGroup) return false

      const targetElement = groupFocusMemory.current.get(targetGroup)
        ?? targetGroup?.querySelector<HTMLElement>('[data-arrow-nav*="x"],[data-arrow-nav*="y"]')
      
      targetElement?.focus()

      return true
    }

    return {
      ArrowLeft(element, axis) {
        if (!axis.includes('x')) return false
        
        return horizontal(element, 'prev')
      },
      ArrowRight(element, axis){
        if (!axis.includes('x')) return false

        return horizontal(element, 'next')
      },
      ArrowUp(element, axis) {
        if (!axis.includes('y')) return false

        return vertical(element, 'prev')
      },
      ArrowDown(element, axis) {
        if (!axis.includes('y')) return false

        return vertical(element, 'next')
      },
    } satisfies Record<string, (target: HTMLElement, axis: Axis[]) => boolean>
  }, [])

  type AvailableArrowHandlers = keyof typeof arrowHandlers

  useEffect(() => {
    const abort = new AbortController()

    document.addEventListener('keydown', e => {
      if (e.defaultPrevented) return

      const target = e.target as HTMLElement
      if (!target.matches('[data-arrow-nav]')) return

      const arrowNav = target.getAttribute('data-arrow-nav')
      if (arrowNav === 'group') return

      const axis = arrowNav?.split('') ?? []

      if (arrowHandlers[e.key as AvailableArrowHandlers]?.(target, axis as Axis[])) {
        e.preventDefault()
      }
    }, { signal: abort.signal })

    document.addEventListener('focus', e => {
      const element = e.target as HTMLElement
      if (!element.matches('[data-arrow-nav*="x"],[data-arrow-nav*="y"]')) return

      const group = element.closest<HTMLElement>('[data-arrow-nav="group"]')

      if (!group) return

      groupFocusMemory.current.set(group, element)
    }, { signal: abort.signal, capture: true })

    return () => abort.abort()
  }, [arrowHandlers])

  const genericHandlers = useMemo(() => ({
    Escape(e) {
      e.preventDefault()
      const firstFocusableNavigatable = getFocusableElements('[data-arrow-nav*="x"],[data-arrow-nav*="y"]').at(0)
      if (firstFocusableNavigatable) {
        const allFocusables = getFocusableElements()
        const previousFocusable = allFocusables.at(allFocusables.indexOf(firstFocusableNavigatable) - 1)
        previousFocusable?.focus()
        previousFocusable?.blur()
      }
      dispatch(playerActions.stop())
    },
    k(e) {
      const { player } = store.getState()

      const hasMedia = (['audio', 'video', 'text'] as (MediaTypes | null)[]).includes(player.type)
      if (!hasMedia) return

      e.preventDefault()

      const isPlaying = player.playState === 'play'

      if (isPlaying)
        dispatch(playerActions.pause())
      else
        dispatch(playerActions.play())
    },
    [','](e) {
      e.preventDefault()
      const { player } = store.getState()

      const currentPlayRate = player.playRate
      const prevPlayRate = SPEED_OPTIONS[Math.max(0, SPEED_OPTIONS.indexOf(currentPlayRate) - 1)]
      if (prevPlayRate !== currentPlayRate)
        dispatch(playerActions.playRate(prevPlayRate))
    },
    ['.'](e) {
      e.preventDefault()
      const { player } = store.getState()

      const currentPlayRate = player.playRate
      const prevPlayRate = SPEED_OPTIONS[Math.min(SPEED_OPTIONS.length - 1, SPEED_OPTIONS.indexOf(currentPlayRate) + 1)]
      if (prevPlayRate !== currentPlayRate)
        dispatch(playerActions.playRate(prevPlayRate))
    },
  } satisfies Record<string, (e: KeyboardEvent) => void>), [store, dispatch])

  type AvailableGenericHandlers = keyof typeof genericHandlers

  useEffect(() => {
    const abort = new AbortController()

    document.addEventListener('keyup', e => {
      if (e.defaultPrevented) return
      if ((e.target as HTMLElement).matches('input, textarea, select')) return
      genericHandlers[e.key as AvailableGenericHandlers]?.(e)
    }, { signal: abort.signal })

    return () => abort.abort()
  }, [genericHandlers])
}

function getFocusableElements(filterSelector = '*') {
  return document.querySelectorAll<HTMLElement>('a[href], area[href], button, input, select, textarea, [tabindex]')
    .values().filter(element => element.matches(`${filterSelector}:not([type="hidden"]):not(:disabled):not([tabindex="-1"])`)).toArray()
}
