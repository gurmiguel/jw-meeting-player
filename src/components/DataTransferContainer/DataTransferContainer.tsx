import { Dispatch, bindActionCreators, createSlice } from '@reduxjs/toolkit'
import clsx from 'clsx'
import { DragEvent, PropsWithChildren, useMemo, useReducer } from 'react'
import { SliceActions } from '../../store/hooks'
import classes from './DataTransferContainer.module.css'

type DivProps = JSX.IntrinsicElements['div']

interface Props extends DivProps {
  onTransfer(files: File[]): void
  validFormats?: string[]
}

const slice = createSlice({
  name: 'dataTransfer',
  initialState: {
    dragging: false,
  },
  reducers: {
    captureDragging(state) {
      state.dragging = true
    },
    releasedDragging(state) {
      state.dragging = false
    },
  },
})

export function DataTransferContainer({ onTransfer, validFormats, children, ...props }: PropsWithChildren<Props>) {
  const [{ dragging }, dispatch] = useReducer(slice.reducer, slice.getInitialState())
  const { captureDragging, releasedDragging } = useMemo(() => (
    bindActionCreators(slice.actions, dispatch as Dispatch<SliceActions<typeof slice>>)
  ), [dispatch])

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    captureDragging()
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    releasedDragging()
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)

    const validFiles = files.filter(file => {
      return (validFormats || [file.type])?.some(format => file.type.startsWith(format))
    })

    releasedDragging()
    if (validFiles.length)
      onTransfer(validFiles)
    else
      alert(`Arquivos não permitidos! Somente ${validFormats?.map(f => f.replace(/\/$/, '')).join(', ')}`)
  }

  return (
    <div
      {...props}
      className={clsx(classes.container, props.className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={dragging}
    >
      {children}
    </div>
  )
}
