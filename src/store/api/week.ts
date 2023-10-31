import { electronApi } from '.'
import { type APIEvents } from '../../../electron/events/api'
import { FetchWeekDataRequest } from '../../../shared/models/FetchWeekData'
import { fileURL } from '../../../shared/utils'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type },
      }),
      transformResponse(response: APIEvents.FetchWeekMediaResponse) {
        return response.map(x => ({
          ...x,
          media: x.media.map(media => ({
            ...media,
            path: fileURL(media.path),
          })),
        }))
      },
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
} = weekApiEndpoints

export default weekApiEndpoints
