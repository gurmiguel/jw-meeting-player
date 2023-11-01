/* eslint-disable react-refresh/only-export-components */
import { Dispatch, PayloadAction, bindActionCreators, createSlice } from '@reduxjs/toolkit'
import { uniqueId } from 'lodash'
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { SliceActions } from '../../store/hooks'
import { Dialog, DialogProps } from './Dialog'
import classes from './Dialog.module.css'

export interface DialogContext {
  show(content: DialogProps['children'], props: Omit<DialogProps, 'children' | 'id'>): string
  hide(id: string): void
}

const dialogContext = createContext({} as DialogContext)

const slice = createSlice({
  name: 'dialog',
  initialState: {
    dialogs: new Array<DialogProps>(),
  },
  reducers: {
    show(state, { payload }: PayloadAction<DialogProps>) {
      state.dialogs.push(payload)
    },
    hide(state, { payload }: PayloadAction<string>) {
      state.dialogs = state.dialogs.filter(({ id }) => id !== payload)
    },
  },
})

export function DialogProvider({ children }: PropsWithChildren) {
  const [{ dialogs }, dispatch] = useReducer(slice.reducer, slice.getInitialState())
  const actions = bindActionCreators(slice.actions, dispatch as Dispatch<SliceActions<typeof slice>>)

  const ctx = useMemo<DialogContext>(() => ({
    show(content, props) {
      const id = uniqueId('dialog_')

      actions.show({ ...props, children: content, id })

      return id
    },
    hide(id) {
      actions.hide(id)
    },
  }), [actions])

  const clickOutsideRef = useClickOutside<HTMLDivElement>(useCallback(() => {
    ctx.hide(dialogs[0].id)
  }, [ctx, dialogs]), !!dialogs[0]?.disableOverlayDismiss)

  return (
    <dialogContext.Provider value={ctx}>
      {children}

      {dialogs.length > 0 && (
        <div className={classes.overlay}>
          {dialogs.slice(0, 1).map(dialog => (
            <Dialog key={dialog.id} ref={clickOutsideRef} {...dialog} />
          ))}
        </div>
      )}
    </dialogContext.Provider>
  )
}

export function useDialog() {
  return useContext(dialogContext)
}
