import { useEffect, useState } from 'react'
import { StorageKeys } from '../../../shared/storage-keys'

export function useStorageValue<T>(key: StorageKeys) {
  const [value, setValue] = useState<T>()

  useEffect(() => {
    setValue(undefined)
    common.storage.get(key)
      .then((value) => {
        setValue(value as T)
      })
  }, [key])

  function dispatchValueChange(value: T | ((oldValue: T) => T)) {
    setValue(oldValue => {
      const newValue = typeof value === 'function'
        ? (value as any)(oldValue)
        : value

      common.storage.set(key, newValue)
        .catch((err) => {
          console.error(err)
          setValue(oldValue)
        })

      return newValue
    })
  }

  return [value, dispatchValueChange] as const
}
