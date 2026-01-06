import { useSettings } from '../../hooks/useSettings'
import { useAppDispatch } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'
import { DialogContent, DialogTitle } from '../Dialog'
import { useDialogContent } from '../Dialog/Dialog'

export function CleaningDialog() {
  const { onDismiss } = useDialogContent()

  const dispatch = useAppDispatch()

  const [previousGroup, updatePreviousGroup] = useSettings<number>('cleaning.previousGroup')
  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const form = e.currentTarget
    const previousGroup = (form.elements.namedItem('group') as HTMLInputElement).valueAsNumber
    const withGeneral = (form.elements.namedItem('general') as HTMLInputElement)?.checked || false

    updatePreviousGroup(previousGroup)

    dispatch(playerActions.displayCleaningGroup({ group: previousGroup, withGeneral }))

    onDismiss()
  }

  return (
    <>
      <DialogTitle>Apresentar grupo de Limpeza</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-row items-center">
            <label className="flex-1">
              <span>Grupo</span>
              <input name="group" type="number" min="1" required autoFocus defaultValue={previousGroup ?? 1} className="w-14 pr-0" />
            </label>

            <label className="inline-flex flex-row gap-4 flex-none">
              <span className="text-sm">Anunciar Limpeza Geral?</span>
              <input name="general" type="checkbox" style={{ appearance: 'checkbox' }} />
            </label>
          </div>

          <div className="dialog-buttons mr-0">
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
