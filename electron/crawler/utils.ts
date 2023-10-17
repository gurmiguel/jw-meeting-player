import { JSDOM } from 'jsdom'

export async function crawl(url: string) {
  return await JSDOM.fromURL(url, {
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  })

  // const response = await fetch(url)

  // if (Math.floor(response.status / 100) === 3) {
  //   const baseURL = new URL(url!).origin
  //   const location = response.headers.get('location')

  //   if (location) {
  //     const redirect = location.startsWith('/') ? baseURL + location : location

  //     return crawl(redirect)
  //   }
  // }

  // return { $ }
}