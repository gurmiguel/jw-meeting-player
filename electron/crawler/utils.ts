import cheerio from 'cheerio'

export async function crawl(url: string) {
  const response = await fetch(url)

  if (Math.floor(response.status / 100) === 3) {
    const baseURL = new URL(url!).origin
    const location = response.headers.get('location')

    if (location) {
      const redirect = location.startsWith('/') ? baseURL + location : location

      return crawl(redirect)
    }
  }

  const $ = cheerio.load(await response.text())

  return { $ }
}