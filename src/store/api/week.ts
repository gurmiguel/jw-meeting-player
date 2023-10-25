import { electronApi } from '.'
import { type APIEvents } from '../../../electron/events/api'
import { FetchWeekDataRequest } from '../../../shared/models/FetchWeekData'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type },
      }),
      transformResponse(response: APIEvents.FetchWeekMediaResponse) {
        return response.map(x => ({
          path: 'file://' + x.path.replace(/\\/g, '/'),
          thumbnail: 'file://' + x.thumbnail.replace(/\\/g, '/'),
          type: x.type,
        }))
      },
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
} = weekApiEndpoints

export default weekApiEndpoints
