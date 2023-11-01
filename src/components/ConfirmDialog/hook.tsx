import { ReactNode, useCallback } from 'react'
import { useDialog } from '../Dialog/DialogProvider'
import { ConfirmDialog } from './ConfirmDialog'

export function useConfirmDialog() {
  const { show: showDialog } = useDialog()

  const confirm = useCallback(async (question: ReactNode, disableOverlayDismiss = false) => {
    try {
      await new Promise<void>((resolve, reject) => {
        showDialog(<ConfirmDialog onConfirm={resolve}>{question}</ConfirmDialog>, { onDismiss: reject, disableOverlayDismiss })
      })
      return true
    } catch {
      return false
    }
  }, [showDialog])

  return confirm
}
