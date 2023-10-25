import downloader from './Downloader'

export async function downloadVideo(url: string) {
  return await downloader.enqueue(url, 'mp4')
}