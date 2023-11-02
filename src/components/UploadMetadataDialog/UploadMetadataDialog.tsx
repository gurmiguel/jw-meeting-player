import { useState } from 'react'
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

  return (
    <>
      <DialogTitle>Incluir Mídia</DialogTitle>
      <DialogContent>
        <form
          onSubmit={e => {
            e.preventDefault()

            const group = (e.currentTarget.elements.namedItem('group') as HTMLInputElement).value
            const label = (e.currentTarget.elements.namedItem('label') as HTMLInputElement).value

            onSubmit({ group, label })
            onDismiss()
          }}
          className={classes.container}
        >
          <label>
            <span>Grupo</span>
            <select
              name={creatingGroup ? 'group-selector' : 'group'}
              defaultValue={defaultGroupExists ? defaultGroup : 'new'}
              onChange={e => setCreatingGroup(e.target.value === 'new')}
            >
              {groups.map(group => <option key={group} value={group}>{group}</option>)}
              <option value="new">Novo Grupo +</option>
            </select>
          </label>
          {creatingGroup && (
            <label>
              <input type="text" name="group" defaultValue={!defaultGroupExists ? defaultGroup : ''} className="-mt-2" placeholder="Digite o nome do Grupo" required autoFocus />
            </label>
          )}
          <label>
            <span>Descrição</span>
            <input type="text" name="label" defaultValue={defaultLabel} required autoFocus />
          </label>

          <div className="dialog-buttons">
            <button
              type="button"
              onClick={onDismiss}
              className="dialog-button"
            >Cancelar</button>
            <button
              type="submit"
              className="dialog-button dialog-button--submit"
            >Confirmar</button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
