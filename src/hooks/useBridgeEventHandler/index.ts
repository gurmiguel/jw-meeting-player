import { useEffect } from 'react'

export function useBridgeEventHandler<E extends EventNames>(event: E, handler: Parameters<PlayerBridge[EventHandlerFromName<E>]>[0], deps: unknown[]) {
  useEffect(() => {
    const eventHandler = `on${event[0].toUpperCase()}${event.slice(1)}` as EventHandlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bridge[eventHandler](handler as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
