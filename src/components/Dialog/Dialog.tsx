/* eslint-disable react-refresh/only-export-components */
import { ReactNode, createContext, forwardRef, useCallback, useContext, useEffect } from 'react'
import './Dialog.base.css'
import classes from './Dialog.module.css'
import { DialogContext, useDialog } from './DialogProvider'

export interface DialogProps {
  id: string
  children: ReactNode | ((ctx: DialogContext, props: Omit<DialogProps, 'children'>) => ReactNode)
  onDismiss(): void
  disableOverlayDismiss?: boolean
}

type DialogContentContext = Omit<DialogProps, 'children'>

const dialogContentContext = createContext({} as DialogContentContext)

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(({ children, onDismiss: handleDismiss, ...props }, ref) => {
  const ctx = useDialog()

  const { hide } = ctx

  const onDismiss = useCallback(() => {
    handleDismiss()
    hide(props.id)
  }, [hide, handleDismiss, props.id])

  useEffect(() => {
    const abort = new AbortController()

    document.body.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onDismiss()
      }
    }, { signal: abort.signal })

    return () => abort.abort()
  }, [onDismiss])

  return (
    <dialogContentContext.Provider value={{ onDismiss, ...props }}>
      <div ref={ref} className={classes.dialog}>
        {typeof children === 'function' ? children(ctx, { onDismiss, ...props }) : children}
      </div>
    </dialogContentContext.Provider>
  )
})

export function useDialogContent() {
  const { hide: _hide, show: _show, ...dialog } = useDialog()
  const dialogContent = useContext(dialogContentContext)

  return {
    ...dialog,
    ...dialogContent,
  }
}
