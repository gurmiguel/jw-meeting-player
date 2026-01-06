import CleaningIcon from '../../assets/cleaning.svg?react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'
import { useDialog } from '../Dialog/DialogProvider'
import { CleaningDialog } from './CleaningDialog'

export function CleaningWidget() {
  const { show: showDialog } = useDialog()

  const dispatch = useAppDispatch()

  const isDisplaying = useAppSelector(state => state.player.displayCleaningGroup)
  
  function handleClick() {
    if (isDisplaying) {
      return dispatch(playerActions.hideCleaningGroup())
    }

    showDialog((
      <CleaningDialog />
    ), {
      onDismiss: () => null,
      disableOverlayDismiss: false,
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="floating-icon-button-wrapper"
      >
        <div className="floating-icon-button">
          <CleaningIcon className="text-2xl" />
        </div>
        <div className="floating-icon-button floating-icon-button-label">
          {isDisplaying ? 'Ocultar grupo de limpeza' : 'Apresentar grupo de limpeza'}
        </div>
      </button>
    </>
  )
}
