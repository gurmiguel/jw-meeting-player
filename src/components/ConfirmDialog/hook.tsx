import { ComponentProps, ReactNode, useCallback } from 'react'
import { useDialog } from '../Dialog/DialogProvider'
import { ConfirmDialog } from './ConfirmDialog'

export function useConfirmDialog() {
  const { show: showDialog } = useDialog()

  const confirm = useCallback(async (question: ReactNode, props?: Partial<Parameters<typeof showDialog>[1] & ComponentProps<typeof ConfirmDialog>>) => {
    const { disableOverlayDismiss = false, cancelLabel, confirmLabel, onConfirm, ...opts } = props ?? {}
    try {
      await new Promise<void>((resolve, reject) => {
        showDialog(
          <ConfirmDialog
            onConfirm={() => {
              resolve()
              onConfirm?.()
            }}
            cancelLabel={cancelLabel}
            confirmLabel={confirmLabel}
          >{question}</ConfirmDialog>,
          {
            onDismiss: () => {
              reject()
              opts.onDismiss?.()
            },
            disableOverlayDismiss,
            ...opts,
          })
      })
      return true
    } catch {
      return false
    }
  }, [showDialog])

  return confirm
}
