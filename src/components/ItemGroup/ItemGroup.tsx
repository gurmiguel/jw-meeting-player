import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { ComponentProps, ForwardedRef, forwardRef } from 'react'

interface Props {
  group: string
  sortableListeners?: SyntheticListenerMap
  hideHandler?: boolean
}

export const ItemGroup = forwardRef(({
  children,
  group,
  hideHandler = false,
  sortableListeners,
  ...props
}: JSX.IntrinsicElements['details'] & Props, ref: ForwardedRef<HTMLDetailsElement>) => {

  return (
    <details
      ref={ref}
      {...props}
      className={clsx(props.className, 'relative cursor-default')}
      data-arrow-nav="group"
    >
      <summary className="relative p-2 pl-4 cursor-pointer hover:bg-zinc-300/5">
        {group}

        {!hideHandler && <ArrowsUpDownIcon
          {...sortableListeners}
          className="h-full absolute-middle right-0 p-2 cursor-grab"
        />}
      </summary>
      {children}
    </details>
  )
})

export function SortableItemGroup({ children, group, disableSorting = false, ...props }: ComponentProps<typeof ItemGroup> & { disableSorting?: boolean }) {
  const {
    listeners,
    setNodeRef,
    transform,
    transition,
    over,
  } = useSortable({
    id: group,
    disabled: disableSorting,
    data: { type: 'group' },
  })

  return (
    <ItemGroup
      ref={setNodeRef}
      {...props}
      group={group}
      sortableListeners={listeners}
      hideHandler={!!over || disableSorting}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children}
    </ItemGroup>
  )
}
