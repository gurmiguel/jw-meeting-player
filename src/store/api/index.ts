import { BaseQueryFn, FetchArgs, FetchBaseQueryError, createApi } from '@reduxjs/toolkit/query/react'

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

    return { data }
  } catch (error: any) {
    console.error('API Error', error)
    return { error }
  }
}

export const electronApi = createApi({
  baseQuery,
  tagTypes: ['Date', 'WeekType'],
  endpoints: () => ({}),
})
