import { BaseQueryFn, FetchArgs, FetchBaseQueryError, createApi } from '@reduxjs/toolkit/query/react'
import log from 'electron-log/renderer'

const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, { signal }) => {
  try {
    const endpoint = typeof args === 'string' ? args : args.url
    const payload = typeof args === 'string' ? {} : args.body
    const data = await api.fetch(endpoint, payload)

    if (signal.aborted) throw new Error('Request aborted.')

    if (data?.error) throw new Error(data.error)

    return { data }
  } catch (error: any) {
    log.error('API Error', error)
    return { error }
  }
}

export const electronApi = createApi({
  baseQuery,
  tagTypes: ['Date', 'WeekType'],
  endpoints: () => ({}),
})
