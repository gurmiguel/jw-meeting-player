import { electronApi } from '.'
import { type APIEvents } from '../../../electron/events/api'
import { FetchWeekDataRequest } from '../../../shared/models/FetchWeekData'
import { UploadMediaRequest } from '../../../shared/models/UploadMedia'
import { fileURL } from '../../../shared/utils'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type, forceSeed }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type, force: !!forceSeed },
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
    uploadMedia: build.mutation<APIEvents.UploadMediaResponse, UploadMediaRequest>({
      query: ({ files, type, isoDate }) => ({
        url: 'upload-media',
        body: { files, type, isoDate },
        method: 'POST',
      }),
      transformResponse(response: APIEvents.UploadMediaResponse) {
        return response.map(x => ({
          ...x,
          media: x.media.map(media => ({
            ...media,
            path: fileURL(media.path),
          })),
        }))
      },
      async onQueryStarted({ isoDate, type, forceSeed }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled

          dispatch(
            weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate, type, forceSeed }, data),
          )
        } catch { /* empty */ }
      },
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
  useUploadMediaMutation,
} = weekApiEndpoints

export default weekApiEndpoints
