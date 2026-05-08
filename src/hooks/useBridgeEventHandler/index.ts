import { useEffect, useEffectEvent } from 'react'

export function useBridgeEventHandler<E extends EventNames>(event: E, handler: Parameters<PlayerBridge[EventHandlerFromName<E>]>[0]) {
  const onEvent = useEffectEvent(() => {
    const eventHandler = `on${event[0].toUpperCase()}${event.slice(1)}` as EventHandlers

    return bridge[eventHandler](handler as any)
  })

  useEffect(() => {
    return onEvent()
  }, [])
}
