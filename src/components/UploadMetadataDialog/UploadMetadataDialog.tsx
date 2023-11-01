import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'
import classes from './UploadMetadataDialog.module.css'

interface Props {
  defaultGroup?: string
  defaultLabel?: string
  groups: string[]
  onSubmit(data: { group: string, label: string }): void
}

export function UploadMetadataDialog({ onSubmit, groups, defaultGroup, defaultLabel }: Props) {
  const { onDismiss } = useDialogContent()
  const defaultGroupExists = !!defaultGroup && groups.includes(defaultGroup)
  const [creatingGroup, setCreatingGroup] = useState(!defaultGroupExists)

  const select = useRef<HTMLSelectElement>(null)
  const selectFocused = useRef(false)

  useEffect(() => {
    function onDocumentClick() {
      if (selectFocused.current) select.current?.blur()
    }

    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [])

  return (
    <>
      <DialogTitle>Incluir Mídia</DialogTitle>
      <DialogContent>
        <form
          onSubmit={e => {
            e.preventDefault()

            const group = (e.currentTarget.elements.namedItem('group') as HTMLInputElement).value
            const label = (e.currentTarget.elements.namedItem('label') as HTMLInputElement).value

            console.log({ group, label })

            onSubmit({ group, label })
            onDismiss()
          }}
          className={classes.container}
        >
          <label className={classes.inputWrapper}>
            <span className={classes.label}>Grupo</span>
            <select
              ref={select}
              name={creatingGroup ? 'group-selector' : 'group'}
              defaultValue={defaultGroupExists ? defaultGroup : 'new'}
              className={classes.input}
              onChange={e => setCreatingGroup(e.target.value === 'new')}
              onMouseDown={() => {
                function onUp() {
                  setTimeout(() => selectFocused.current = true, 100)
                  document.removeEventListener('mouseup', onUp)
                }
                document.addEventListener('mouseup', onUp)
              }}
              onBlur={() => selectFocused.current = false}
            >
              {groups.map(group => <option key={group} value={group}>{group}</option>)}
              <option value="new">Novo Grupo +</option>
            </select>
          </label>
          {creatingGroup && (
            <label className={classes.inputWrapper}>
              <input type="text" name="group" defaultValue={!defaultGroupExists ? defaultGroup : ''} className={clsx(classes.input, '-mt-2')} placeholder="Digite o nome do Grupo" required autoFocus />
            </label>
          )}
          <label className={classes.inputWrapper}>
            <span className={classes.label}>Descrição</span>
            <input type="text" name="label" defaultValue={defaultLabel} className={classes.input} required autoFocus />
          </label>

          <div className={classes.buttons}>
            <button
              type="button"
              onClick={onDismiss}
              className={classes.button}
            >Cancelar</button>
            <button
              type="submit"
              className={clsx(classes.button, classes.buttonSubmit)}
            >Confirmar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
