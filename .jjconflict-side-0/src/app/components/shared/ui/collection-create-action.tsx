import { Button } from './button.js'
import { EntityEditorDialog, type EntityEditorDialogProps } from './entity-editor-dialog.js'

export type CollectionCreateActionProps = Omit<EntityEditorDialogProps, 'trigger'> & {
  label: string
}

/** Place this action in the header of the collection it creates an item in. */
export function CollectionCreateAction({ label, ...props }: CollectionCreateActionProps) {
  return <EntityEditorDialog {...props} trigger={<Button type="button">{label}</Button>} />
}
