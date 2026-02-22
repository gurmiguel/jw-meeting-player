import { Dispatch, bindActionCreators, createSlice } from '@reduxjs/toolkit'
import clsx from 'clsx'
import logger from 'electron-log/renderer'
import { DragEvent, PropsWithChildren, useMemo, useReducer } from 'react'
import { getSortedTransferFiles, getWebdataBase64Files } from '../../lib/filesystem'
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
  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    const items = Array.from(e.dataTransfer.files)

    let files: File[] = items
    try {
      files = await getSortedTransferFiles(files)
      files = await getWebdataBase64Files(files)
    } catch (ex) {
      logger.error(ex)

      files = items
    }

    const validFiles = files.filter(file => {
      return (validFormats || [file.type])?.some(extOrFormat => 
        file.type.startsWith(extOrFormat) || file.name.replace(/.*(\.[^.]+)$/, '$1').toLowerCase() === extOrFormat.toLowerCase(),
      )
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
