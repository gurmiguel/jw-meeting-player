export class JWApiUrlBuilder {
  private url = new URL('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS')

  constructor(private lang: string) {
    this.url.searchParams.set('alllangs', '0')
    this.url.searchParams.set('txtCMSLang', this.lang)
    this.url.searchParams.set('langwritten', this.lang)
  }

  setPub(pub: string) {
    this.url.searchParams.set('pub', pub)
    return this
  }

  setFileFormat(format: string) {
    this.url.searchParams.set('fileformat', format)
    return this
  }

  setDocId(docId: string) {
    this.url.searchParams.set('docid', docId)
    return this
  }

  setTrack(track: string) {
    this.url.searchParams.set('track', track)
    return this
  }

  setIssue(issue: string) {
    this.url.searchParams.set('issue', issue)
    return this
  }

  setChapter(chapter: number) {
    return this.setTrack(String(chapter))
  }

  setBookNum(booknum: number) {
    this.url.searchParams.set('booknum', String(booknum))
    return this
  }

  build() {
    if (!this.url.searchParams.has('fileformat'))
      throw new Error('JW API Url requires the `fileformat` parameter, which was not informed')
    if (!this.url.searchParams.has('pub') && !this.url.searchParams.has('docid'))
      throw new Error('JW API Url requires the `pub` or `docid` parameters, which were not informed')
    
    const pub = this.url.searchParams.get('pub')
    
    if (pub && pub !== 'nwt') {
      if (!this.url.searchParams.has('track'))
        throw new Error('JW API Url requires the `track` parameter for publications, which was not informed')
    }

    return this.url
  }
}
