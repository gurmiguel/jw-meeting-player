import clsx from 'clsx'
import { useRef, useState } from 'react'

interface Props {
  fromParent?: boolean
}

type Dimensions = { width: number, height: number }

export function ZoomingImage({ src, className, fromParent = false, ...props }: Overwrite<React.ComponentProps<'img'>, Props>) {
  const img = useRef<HTMLImageElement>(null)
  const [aspectRatio, setAspectRatio] = useState<number>()

  function handleOnLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    const parent = img.parentElement as HTMLElement

    const image = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    }

    
    const container = {
      width: parent.clientWidth,
      height: parent.clientHeight,
    }
    
    const imageSizeMode = sizeMode(image)
    const imageAspectRatio = image.height / image.width
    
    setAspectRatio(imageAspectRatio)

    switch (imageSizeMode) {
      case 'landscape':
        img.style.setProperty('--hover-scale', String(image.height / image.width))
        img.style.setProperty('--height', container.height + 'px')
        img.style.setProperty('--width', container.height / imageAspectRatio + 'px')
        break
      case 'portrait':
        img.style.setProperty('--hover-scale', String(image.width / image.height))
        img.style.setProperty('--height', container.width * imageAspectRatio + 'px')
        img.style.setProperty('--width', container.width + 'px')
        break
    }
  }

  const sizingClass = {
    parent: 'group-hover:scale-[var(--hover-scale)] group-hover:scale-[var(--hover-scale)]',
    self: 'hover:scale-[var(--hover-scale)] hover:scale-[var(--hover-scale)]',
  }

  return (
    <img
      ref={img}
      src={src}
      onLoad={handleOnLoad}
      {...props}
      className={clsx(
        className,
        'object-contain transition duration-300 max-w-[unset]',
        'absolute-center -translate-x-1/2 -translate-y-1/2 origin-center',
        sizingClass[fromParent ? 'parent' : 'self'],
        aspectRatio !== 1 && 'image-resized',
        'w-[var(--width)] h-[var(--height)]',
      )}
    />
  )
}

function sizeMode(dimensions: Dimensions) {
  return dimensions.width > dimensions.height ? 'landscape' : 'portrait'
}
