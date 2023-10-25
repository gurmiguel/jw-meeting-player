import downloader from './Downloader'

export async function downloadImage(url: string) {
  return await downloader.enqueue(url, 'jpeg')
}