import { electronApi } from '.'
import { type APIEvents } from '../../../electron/events/api'
import { FetchWeekDataRequest } from '../../../shared/models/FetchWeekData'
import { RemoveMediaRequest } from '../../../shared/models/RemoveMedia'
import { UploadMediaRequest } from '../../../shared/models/UploadMedia'
import { fileLocalPath, fileURL } from '../../../shared/utils'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type, forceSeed }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type, force: !!forceSeed },
      }),
      providesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
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
    removeMedia: build.mutation<APIEvents.RemoveMediaResponse, RemoveMediaRequest>({
      query: ({ isoDate, type, item }) => ({
        url: 'remove-media',
        body: {
          isoDate,
          type,
          item: {
            ...item,
            media: item.media.map(it => ({ ...it, path: fileLocalPath(it.path) })),
          },
        },
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
  useUploadMediaMutation,
  useRemoveMediaMutation,
} = weekApiEndpoints

export default weekApiEndpoints
