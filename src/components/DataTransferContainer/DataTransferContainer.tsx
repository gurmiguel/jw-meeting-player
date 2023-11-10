import { Dispatch, bindActionCreators, createSlice } from '@reduxjs/toolkit'
import clsx from 'clsx'
import { DragEvent, PropsWithChildren, useMemo, useReducer } from 'react'
import { SliceActions } from '../../store/hooks'
import { useConfirmDialog } from '../ConfirmDialog/hook'
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

  const promptConfirm = useConfirmDialog()

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
      promptConfirm(`Arquivos não permitidos! Somente ${validFormats?.map(f => f.replace(/\/$/, '')).join(', ')}`, {
        cancelLabel: false,
        confirmLabel: 'OK',
      })
  }

  return (
    <div
      {...props}
      className={clsx([
        classes.container,
        props.className,
        dragging && classes.containerDragging,
      ])}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {dragging && (
        <div className={classes.draggingHint}>Solte o(s) arquivo(s) aqui</div>
      )}
    </div>
  )
}
