import { electronApi } from '.'
import { ParsedMedia, ProcessedResult } from '../../../electron/api/crawler/types'
import { type APIEvents } from '../../../electron/events/api'
import { AddSongRequest } from '../../../shared/models/AddSong'
import { FetchWeekDataRequest } from '../../../shared/models/FetchWeekData'
import { RemoveMediaRequest } from '../../../shared/models/RemoveMedia'
import { UploadMediaRequest } from '../../../shared/models/UploadMedia'
import { fileLocalPath, fileURL } from '../../../shared/utils'
import { getFilename } from '../../lib/utils'

const weekApiEndpoints = electronApi.injectEndpoints({
  endpoints: build => ({
    fetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type },
      }),
      providesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
      transformResponse({ items }: APIEvents.FetchWeekMediaResponse) {
        return {
          items: items.map(x => ({
            ...x,
            media: (x.media as ParsedMedia[]).map(media => ({
              ...media,
              path: fileURL(media.path),
            })),
          })) as ProcessedResult[],
        }
      },
    }),
    refetchWeekMedia: build.query<APIEvents.FetchWeekMediaResponse, FetchWeekDataRequest>({
      query: ({ isoDate, type }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type, force: true },
      }),
      transformResponse({ items }: APIEvents.FetchWeekMediaResponse) {
        return {
          items: items.map(x => ({
            ...x,
            media: (x.media as ParsedMedia[]).map(media => ({
              ...media,
              path: fileURL(media.path),
            })),
          })) as ProcessedResult[],
        }
      },
      async onQueryStarted({ isoDate, type }, { dispatch, queryFulfilled }) {
        try {
          dispatch(
            weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate, type }, undefined as any),
          )

          const { data } = await queryFulfilled

          dispatch(
            weekApiEndpoints.util.upsertQueryData('fetchWeekMedia', { isoDate, type }, data),
          )
        } catch { /* empty */ }
      },
    }),
    preloadMeeting: build.mutation<void, FetchWeekDataRequest>({
      query: ({ isoDate, type }) => ({
        url: 'fetch-week-data',
        body: { isoDate, type },
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
    }),
    uploadMedia: build.mutation<APIEvents.UploadMediaResponse, UploadMediaRequest>({
      query: ({ files, type, isoDate }) => ({
        url: 'upload-media',
        body: { files, type, isoDate },
        method: 'POST',
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
    }),
    removeMedia: build.mutation<APIEvents.RemoveMediaResponse, RemoveMediaRequest>({
      query: ({ isoDate, type, item }) => ({
        url: 'remove-media',
        body: {
          isoDate,
          type,
          item: {
            ...item,
            media: (item.media as ParsedMedia[]).map(it => ({ ...it, path: fileLocalPath(it.path) })),
          },
        },
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
    }),
    addSong: build.mutation<APIEvents.AddSongResponse, AddSongRequest>({
      query: ({ isoDate, type, group, song }) => ({
        url: 'add-song',
        body: { isoDate, type, group, song },
        method: 'POST',
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
    }),
    updateMediaProgress: build.mutation<null, FetchWeekDataRequest & { mediaPath: string, progress: number }>({
      queryFn({ isoDate, type, mediaPath, progress }, { dispatch }) {
        dispatch(
          weekApiEndpoints.util.updateQueryData('fetchWeekMedia', { isoDate, type }, data => {
            data.items.forEach(item => {
              (item.media as ParsedMedia[]).forEach(media => {
                if (getFilename(media.path) === mediaPath) {
                  media.downloadProgress = progress
                }
              })
            })
          }),
        )

        return { data: null }
      },
    }),
    updateMetadata: build.mutation<APIEvents.UpdateMetadataResponse, APIEvents.UpdateMetadataPayload>({
      query: ({ isoDate, type, metadata }) => ({
        url: 'update-metadata',
        body: {
          isoDate,
          type,
          metadata: metadata.map(item => ({
            ...item,
            media: (item.media as ParsedMedia[]).map(it => ({ ...it, path: fileLocalPath(it.path) })),
          })),
        },
        method: 'POST',
      }),
      invalidatesTags: (_, __, { isoDate, type }) => [{ type: 'Date', id: isoDate }, { type: 'WeekType', id: type }],
      onQueryStarted({ isoDate, type, metadata }, { dispatch, queryFulfilled }) {
        const patch = dispatch(weekApiEndpoints.util.updateQueryData('fetchWeekMedia', { isoDate, type },  () => {
          return { items: metadata }
        }))

        queryFulfilled.catch(() => patch.undo())
      },
    }),
  }),
})

export const {
  useFetchWeekMediaQuery,
  useLazyFetchWeekMediaQuery,
  usePreloadMeetingMutation,
  useUploadMediaMutation,
  useRemoveMediaMutation,
  useAddSongMutation,
  useLazyRefetchWeekMediaQuery,
  useUpdateMediaProgressMutation,
  useUpdateMetadataMutation,
} = weekApiEndpoints

export default weekApiEndpoints
