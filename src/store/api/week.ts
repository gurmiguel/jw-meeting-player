import { electronApi } from '.'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<object, Date>({
      query: date => ({
        url: 'fetch-week-data',
        body: { isoDate: date.toISOString() },
      }),
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
} = weekApiEndpoints

export default weekApiEndpoints
