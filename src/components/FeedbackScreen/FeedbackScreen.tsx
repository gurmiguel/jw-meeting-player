import { MagnifyingGlassPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { MouseEvent, useEffect, useRef, useState } from 'react'
import { useDraggable } from '../../hooks/useDraggable'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { initialState as initialPlayer, playerActions } from '../../store/player/slice'
import { ZoomTool } from '../ZoomTool/ZoomTool'

interface Props {
  sourceId: string | null
}

const ASPECT_RATIO = 16 / 9
const height = 270
const width = height * ASPECT_RATIO

export function FeedbackScreen({ sourceId }: Props) {
  const dispatch = useAppDispatch()
  
  const video = useRef<HTMLVideoElement>(null)

  const media = useAppSelector(state => ({
    type: state.player.type,
    file: state.player.file,
  }))

  const [stream, setStream] = useState<MediaStream>()

  const [zoomMode, setZoomMode] = useState(false)

  const [dragHandlers, dragging] = useDraggable<HTMLDivElement>({ gutter: 8, disabled: zoomMode === true })

  const showStreamFeedback = !!sourceId && !zoomMode

  useEffect(() => {
    if (!showStreamFeedback) return

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          aspectRatio: ASPECT_RATIO,
        },
      },
    }).then(stream => {
      setStream(stream)
    })
    
    return () => {
      setStream(undefined)
    }
  }, [showStreamFeedback, sourceId])

  useEffect(() => {
    if (!video.current || !stream) return

    video.current.srcObject = stream
  }, [stream])

  function handleZoomToggle(e: MouseEvent) {
    e.preventDefault()
    e.nativeEvent.stopImmediatePropagation()

    setZoomMode(it => !it)
    dispatch(playerActions.zoomLevel({ zoomLevel: initialPlayer.zoomLevel, position: initialPlayer.position }))
  }

  return (
    <div
      {...dragHandlers}
      className={clsx([
        'fixed z-10 rounded-md overflow-hidden',
        dragging && 'cursor-grabbing',
        !zoomMode && 'bottom-2 right-2 bg-black cursor-grab resize',
        zoomMode && 'top-16 left-8 p-4 bg-zinc-800',
      ])} 
      style={!zoomMode ? { width, height } : { width: 'calc(100% - 4.5rem)', height: 'calc(100% - 5.5rem)' }}
    >
      {showStreamFeedback && (
        <video
          ref={video}
          onLoadedMetadata={() => video.current?.play()}
          className="block w-full h-full object-contain"
        />
      )}

      {zoomMode && (
        <>
          <img src={media.file ?? ''} className="block w-full h-full object-contain" />
          <ZoomTool gutter={16} />
        </>
      )}

      <div className="controls absolute top-4 left-4 z-10">
        {media.type === 'image' && (
          <button type="button" className="p-2 icon-shadow transition appearance-none bg-transparent" onClick={handleZoomToggle}>
            {!zoomMode
              ? <MagnifyingGlassPlusIcon className="h-6" />
              : <XMarkIcon className="h-6" />}
          </button>
        )}
      </div>
    </div>
  )
}
