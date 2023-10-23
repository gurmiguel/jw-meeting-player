import { useEffect, useRef, useState } from 'react'
import { useDraggable } from '../../hooks/useDraggable'
import clsx from 'clsx'

interface Props {
  sourceId: string
}

const ASPECT_RATIO = 16 / 9
const height = 270
const width = height * ASPECT_RATIO

export function FeedbackScreen({ sourceId }: Props) {
  const video = useRef<HTMLVideoElement>(null)

  const [stream, setStream] = useState<MediaStream>()

  const [container, dragHandlers, dragging] = useDraggable<HTMLDivElement>(8)

  useEffect(() => {
    if (!sourceId) return

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minWidth: width,
          maxWidth: width,
          minHeight: height,
          maxHeight: height,
        },
      }
    }).then(stream => {
      setStream(stream)
    })
    
    return () => {
      setStream(undefined)
    }
  }, [sourceId])

  useEffect(() => {
    if (!video.current || !stream) return

    video.current.srcObject = stream
  }, [stream])

  return (
    <div ref={container} {...dragHandlers} className={clsx('fixed bottom-2 right-2 rounded-md bg-black overflow-hidden cursor-grab', dragging && 'cursor-grabbing')} style={{ width: width, height }}>
      <video
        ref={video}
        onLoadedMetadata={() => video.current?.play()}
        className="block w-full h-full object-contain"
      />
    </div>
  )
}
