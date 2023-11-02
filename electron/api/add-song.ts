import path from 'node:path'
import { WeekType } from '../../shared/models/WeekType'
import { Deleter } from './Deleter'
import Downloader from './Downloader'
import { CrawlerUtils } from './parser/CrawlerUtils'
import { SongsParser } from './parser/parsers/SongsParser'
import { uploadMedia } from './upload-media'

const SONGS_CONTEXT = 'songs-temp'

export async function addSong(date: Date, type: WeekType, group: string, song: number) {
  const downloader = new Downloader()
  downloader.setContext(SONGS_CONTEXT)

  const utils = new CrawlerUtils(downloader)

  const downloadedSong = await utils.fetchPublicationVideo(utils.generateDataVideoURL(SongsParser.SONG_PUB_ID, song))
  
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
