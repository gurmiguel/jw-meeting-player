import { useState } from 'react'

type KeyPath = string
type SettingsValue = string | number | boolean | Record<string, unknown> | null

export function useSettings<T extends SettingsValue>(key: KeyPath) {
  const [value, setValue] = useState<T | null>(() => {
    const value = localStorage.getItem(key)
    if (value !== null)
      return JSON.parse(value) as T
    return null
  })

  async function update(newValue: T) {
    setValue(newValue)

    localStorage.setItem(key, JSON.stringify(newValue))
  }

  return [value, update] as const
}
