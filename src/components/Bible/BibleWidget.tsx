import { ArrowUturnLeftIcon, BookOpenIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { ParsedText } from '../../../electron/api/crawler/types'
import { APIEvents } from '../../../electron/events/api'
import { BibleIndex, BookChapter } from '../../../shared/models/Bible'
import { delay, millisecondsFromString } from '../../../shared/utils'
import LoadingIcon from '../../assets/loading.svg?react'
import { useAppDispatch, useAppStore } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'

export function BibleWidget() {
  const store = useAppStore()
  const dispatch = useAppDispatch()

  const [openBible, setOpenBible] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  const [index, setIndex] = useState<BibleIndex[]>()
  const [chapters, setChapters] = useState<BookChapter[]>()

  const [selectedBook, setSelectedBook] = useState<BibleIndex>()
  const [selectedChapter, setSelectedChapter] = useState<BookChapter>()
  const [selectedVerses, setSelectedVerses] = useState<number[]>([])
  const [audioOnly, setAudioOnly] = useState(false)

  const [loadedMedia, setLoadedMedia] = useState<ParsedText>()

  useEffect(() => {
    setIsLoading(true)
    api.fetch('bible/index', {})
      .then(setIndex)
      .then(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedBook) return

    setIsLoading(true)
    delay(100).then(() => api.fetch('bible/index', { booknum: selectedBook.id }))
      .then(setChapters)
      .then(() => setIsLoading(false))
  }, [selectedBook])

  useEffect(() => {
    if (openBible) return

    setSelectedBook(undefined)
  }, [openBible])

  useEffect(() => {
    if (selectedBook) return

    setChapters(undefined)
    setSelectedChapter(undefined)
  }, [selectedBook])

  useEffect(() => {
    if (chapters?.length === 1) {
      setSelectedChapter(chapters[0])
    }
  }, [chapters])

  useEffect(() => {
    if (selectedChapter) return

    setSelectedVerses([])
  }, [selectedChapter])

  function handleOverlayClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).role !== 'presentation') return

    setOpenBible(false)
  }

  const stepBack = useCallback(() => {
    if (selectedChapter) {
      setSelectedChapter(undefined)
      if (chapters?.length === 1)
        setSelectedBook(undefined)
    } else if (selectedBook) {
      setSelectedBook(undefined)
    } else {
      setOpenBible(false)
    }
  }, [chapters?.length, selectedBook, selectedChapter])

  function toggleVerse(verse: number, merge = false) {
    setSelectedVerses(current => {
      current.sort((a, b) => a - b)
      if (current.includes(verse)) {
        if (merge) {
          const verseIndex = current.indexOf(verse)
          let from = verseIndex
          let to = verseIndex
          while (from > -1 && current[from - 1] === current[from] - 1)
            from = from - 1
          while (to < current.length && current[to + 1] === current[to] + 1)
            to = to + 1
          return [
            ...current.slice(0, from),
            ...current.slice(to + 1),
          ]
        }
        return current.filter(it => it !== verse)
      } else if (merge && current.length > 0) {
        const lastPrevious = current.findLast(it => it < verse)
        if (lastPrevious !== undefined) {
          const fillingNumbers = new Array(verse - lastPrevious).fill(null).map((_, i) => i + 1 + lastPrevious)
          return current.concat(fillingNumbers)
        }
        const lastNext = current.find(it => it > verse)
        if (lastNext !== undefined) {
          const fillingNumbers = new Array(lastNext - verse).fill(null).map((_, i) => i + verse)
          return current.concat(fillingNumbers)
        }
      }

      return current.concat([verse])
    })
  }

  const autoStart = useRef(false)

  async function handleSubmitVerses() {
    setIsLoading(true)
    try {
      const { player } = store.getState()
      const isPlaying = player.playState === 'play' && player.type === 'text'

      const response = await api.fetch<APIEvents.FetchBibleVersesResponse>('bible/verses', {
        booknum: selectedBook?.id,
        chapter: selectedChapter?.chapter,
        verses: selectedVerses,
      })

      if (isPlaying) {
        dispatch(playerActions.stop())
        await delay()
      }

      const media = response.media[0]

      setLoadedMedia(media)

      dispatch(playerActions.start({
        file: media.audioURL,
        type: audioOnly ? 'audio' : 'text',
        content: `<h2>${selectedBook?.bookName} ${selectedChapter?.chapter}:${formatVerses(selectedVerses)}</h2>\n` + media.content,
      }))

      if (isPlaying)
        autoStart.current = true
    } finally {
      setIsLoading(false)
      setOpenBible(false)
    }
  }

  useEffect(() => {
    if (!loadedMedia) return
    
    const markers = loadedMedia.markers
    let currentMarker = 0

    let started = false
    const events = new Array<IpcRendererCallbackUnsubscriber>()
    events.push(
      bridge.onTime(({ current: time }) => {
        if (!started) {
          dispatch(playerActions.time({
            currentTime: millisecondsFromString(markers[0].startTime) / 1000,
          }))
          dispatch(playerActions.verseChange({ verse: markers[currentMarker].verseNumber }))
          started = true
          if (audioOnly || autoStart.current)
            dispatch(playerActions.play())
          autoStart.current = false
          return
        }

        const currentMarkerLimit = (millisecondsFromString(markers[currentMarker].startTime) + millisecondsFromString(markers[currentMarker].duration)) / 1000

        if (time + 0.500 >= currentMarkerLimit) {
          if (markers.length > currentMarker + 1) {
            const isSeparateVersePair = Math.abs(markers[currentMarker].verseNumber - markers[currentMarker + 1].verseNumber) > 1
            currentMarker += 1
            if (isSeparateVersePair) {
              dispatch(playerActions.time({
                currentTime: millisecondsFromString(markers[currentMarker].startTime) / 1000,
              }))
            }
            dispatch(playerActions.verseChange({ verse: markers[currentMarker].verseNumber }))
          } else {
            if (audioOnly)
              return dispatch(playerActions.stop())

            currentMarker = 0
            dispatch(playerActions.pause())
            dispatch(playerActions.time({
              currentTime: millisecondsFromString(markers[currentMarker].startTime) / 1000,
            }))
            dispatch(playerActions.verseChange({ verse: markers[currentMarker].verseNumber, scroll: false }))
          }
        }
      }),
      bridge.onStop(() => {
        setLoadedMedia(undefined)
      }),
    )
    
    return () => {
      events.forEach(unsub => unsub())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, loadedMedia])

  useEffect(() => {
    if (!openBible) return

    const abort = new AbortController()

    document.body.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        stepBack()
      }
    }, { signal: abort.signal })

    return () => abort.abort()
  }, [openBible, stepBack])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenBible(state => !state)}
        className="floating-icon-button-wrapper"
      >
        <div className="floating-icon-button">
          <BookOpenIcon className="h-8" />
        </div>
        <div className="floating-icon-button floating-icon-button-label">Abrir texto da Bíblia</div>
      </button>

      {openBible && (
        <div className="fixed w-full h-full bg-black/70 flex items-center justify-center z-20" onClick={handleOverlayClick} role="presentation">
          <div className="max-h-[800px] max-w-[760px] w-10/12 h-5/6 bg-zinc-900 p-6 pr-0 relative" onAuxClick={() => stepBack()}>
            {isLoading && (
              <div className="absolute-fill bg-black/50">
                <LoadingIcon className="absolute-center z-10 text-9xl" />
              </div>
            )}
            {index !== undefined && (
              <div className="relative flex flex-col h-full overflow-y-auto pr-6">
                {selectedBook === undefined && (
                  <>
                    <div className="flex justify-between">
                      <h2 className="flex items-center">Bíblia</h2>
                      <button className="bg-transparent p-2" onClick={() => stepBack()}>
                        <XMarkIcon className="h-6" />
                      </button>
                    </div>
                    <div className="grid grid-flow-row grid-cols-4 gap-0.5 mt-3">
                      {index.map((book, i) => (
                        <Fragment key={book.id}>
                          {i === 39 && <div className="col-start-1 col-end-5 mt-6"/>}
                          <button
                            type="button"
                            className={`bg-purple-${getBibleBookColor(book.id)}/30 hover:bg-purple-${getBibleBookColor(book.id)}/20 active:bg-purple-${getBibleBookColor(book.id)}/10 transition-colors px-2 flex items-center justify-center h-11 text-sm`}
                            onClick={() => setSelectedBook(book)}
                          >{remapBookName(book.bookName)}</button>
                        </Fragment>
                      ))}
                    </div>
                  </>
                )}
                {selectedBook !== undefined && (
                  <>
                    <div className="flex justify-between items-top">
                      <h2 className="flex items-center font-semibold">
                        <button className="bg-transparent mr-2" onClick={() => stepBack()}>
                          <ArrowUturnLeftIcon className="h-5" />
                        </button>
                        {selectedBook.bookName}
                        {selectedChapter && chapters?.length !== 1 && <> {selectedChapter.chapter}</>}
                      </h2>

                      {selectedChapter && <small><em><strong>Shift + Click</strong> para (de)selecionar múltiplos versículos</em></small>}
                    </div>

                    {selectedChapter === undefined && (
                      <div className="flex flex-wrap gap-0.5 mt-4">
                        {chapters?.map((chapter) => (
                          <button
                            type="button"
                            className="w-16 h-16 bg-purple-600/30 hover:bg-purple-600/20 active:bg-purple-600/10 transition-colors px-2 flex items-center justify-center text-lg font-bold"
                            onClick={() => setSelectedChapter(chapter)}
                          >{chapter.chapter}</button>
                        ))}
                      </div>
                    )}
                    {selectedChapter !== undefined && (
                      <>
                        <div className="flex-grow">
                          <div className="flex flex-wrap gap-0.5 mt-4">
                            {new Array(selectedChapter.verses).fill(null).map((_, i) => {
                              const verse = i + 1
                              const isSelected = selectedVerses.includes(verse)
                              return (
                                <button
                                  type="button"
                                  className={`w-16 h-16 bg-purple-${isSelected ? 500 : 950}/30 hover:bg-purple-${isSelected ? 500 : 950}/20 active:bg-purple-${isSelected ? 500 : 950}/10 transition-colors px-2 flex items-center justify-center text-lg font-bold`}
                                  onClick={(e) => toggleVerse(verse, e.shiftKey)}
                                >{verse}</button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="sticky bottom-0 flex justify-center mt-5">
                          <button
                            type="button"
                            className="h-11 px-4 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 disabled:bg-zinc-700 transition-colors font-semibold uppercase"
                            onClick={handleSubmitVerses}
                            disabled={selectedVerses.length === 0}
                          >Confirmar</button>

                          <div className="absolute right-0 bottom-4">
                            <label className="flex flex-row-reverse items-center gap-3">
                              <span className="text-sm italic">Somente áudio</span>
                              <input
                                type="checkbox"
                                checked={audioOnly}
                                onChange={() => setAudioOnly(value => !value)}
                                style={{ appearance: 'checkbox' }}
                              />
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function getBibleBookColor(booknum: number) {
  if (booknum <= 5) return 900
  if (booknum <= 17) return 500
  if (booknum <= 22) return 800
  if (booknum <= 39) return 600
  if (booknum <= 43) return 900
  if (booknum <= 44) return 700
  if (booknum <= 65) return 500
  return 900
}

function remapBookName(name: string) {
  if (/salmo/i.test(name)) return 'Salmos'
  if (/c.ntico de salom.o/i.test(name)) return 'Cântico de Salomão'

  return name
}

function formatVerses(verses: number[]) {
  const sortedVerses = verses.toSorted((a, b) => a - b)

  let str = ''

  sortedVerses.forEach((verse, i) => {
    if (i === 0) {
      str += verse
      return
    }

    const previous = sortedVerses[i - 1]
    const next = sortedVerses[i + 1]
    
    // verses separated
    if (verse - previous > 1) {
      str += `, ${verse}`
    // verses in sequence
    } else {
      // finished sequence
      if (next - verse > 1 || i === sortedVerses.length - 1)
        if (str.endsWith('-'))
          str += verse
        else
          str += `,${verse}`
      else if (!str.endsWith('-'))
        str += '-'
    }
  })

  return str
}
