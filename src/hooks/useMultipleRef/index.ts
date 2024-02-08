import React from 'react'

export function useMultipleRef<R>(
  ...refs: (
    | React.RefObject<R>
    | React.MutableRefObject<R>
    | React.Ref<R>
    | null
  )[]
) {
  const setRefs: React.Ref<R> = ref => {
    for (const refSetter of refs) {
      if (typeof refSetter === 'function') refSetter(ref)
      else if (refSetter) Object.assign(refSetter, { current: ref })
    }
  }

  return setRefs
}
