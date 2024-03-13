import path from 'node:path'
import { WeekType } from '../../shared/models/WeekType'
import { existsInJWLibrary, getMediaDuration, getMediaTitle } from '../utils/video-utils'
import { Deleter } from './Deleter'
import Downloader from './Downloader'
import { CrawlerUtils } from './crawler/CrawlerUtils'
import { SongsParser } from './crawler/parsers/SongsParser'
import { uploadMedia } from './upload-media'

const SONGS_CONTEXT = 'songs-temp'

export async function addSong(date: Date, type: WeekType, group: string, song: number) {
  const downloader = new Downloader()
  downloader.setContext(SONGS_CONTEXT)

  const utils = new CrawlerUtils(downloader)

  let downloadedSong: {
    title: string;
    duration: any;
    path: string;
    thumbnail: string | null;
  } | null

  const jwlibrarySongPath = await existsInJWLibrary(`${SongsParser.SONG_PUB_ID}_T_${String(song).padStart(3, '0')}_r720P.mp4`)

  if (jwlibrarySongPath) {
    downloadedSong = {
      ...await downloader.enqueue(jwlibrarySongPath, 'mp4'),
      title: await getMediaTitle(jwlibrarySongPath),
      duration: await getMediaDuration(jwlibrarySongPath),
    }
  } else {
    downloadedSong = await utils.fetchPublicationVideo(utils.generateDataVideoURL(SongsParser.SONG_PUB_ID, song))
  }
  
  await downloader.flush()

  if (!downloadedSong) return

  const songFile = {
    group,
    label: SongsParser.parseSongLabel(song, downloadedSong.title),
    file: {
      name: path.basename(downloadedSong.path),
      path: downloadedSong.path,
    },
  }

  await uploadMedia(date, type, [songFile])

  const deleter = new Deleter()
  deleter.setContext(SONGS_CONTEXT)

  await deleter.enqueue('.')
  await deleter.flush()
}
