import type { ComponentProps } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root

export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent({
  className,
  children,
  presentation = 'default',
  ...props
}: ComponentProps<typeof DialogPrimitive.Popup> & { presentation?: 'default' | 'header-menu' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className={cn(
          'fixed inset-0 z-30 bg-black/40',
          presentation === 'header-menu' && 'header-menu-backdrop',
        )}
      />
      <DialogPrimitive.Viewport
        data-slot="dialog-overlay"
        className={cn(
          'fixed inset-0 z-30 flex items-end justify-center p-4 sm:items-center',
          presentation === 'header-menu' && 'header-menu-viewport',
        )}
      >
        <DialogPrimitive.Popup
          className={cn(
            'max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-base border-2 border-border bg-secondary-background p-6 shadow-shadow',
            presentation === 'header-menu' && 'header-menu-panel',
            className,
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('space-y-2', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap justify-end gap-2 border-t-2 border-border pt-4', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-figure font-heading', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-muted', className)} {...props} />
}

export function DialogClose({ className, ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close className={cn(className)} {...props} />
}
