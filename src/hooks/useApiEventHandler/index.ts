import { useEffect } from 'react'

export function useApiEventHandler<T = any>(topic: string, handler: (data: T) => void, deps: unknown[]) {
  useEffect(() => {
    return api.listen(topic, handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
