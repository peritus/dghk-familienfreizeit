import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-bold ring-offset-background motion-safe:transition-all motion-reduce:transform-none gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-offline disabled:text-muted disabled:border-dashed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-100 data-disabled:bg-offline data-disabled:text-muted data-disabled:border-dashed data-disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'text-main-foreground bg-main border-2 border-border pressable',
        noShadow: 'text-main-foreground bg-main border-2 border-border',
        neutral: 'bg-secondary-background text-foreground border-2 border-border pressable',
        danger: 'text-danger-foreground bg-danger border-2 border-border pressable',
        reverse:
          'text-main-foreground bg-main border-2 border-border hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow',
      },
      size: {
        default: 'min-h-11 px-4 py-2',
        xs: 'h-8 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'size-10',
        'icon-xs': 'size-8 [&_svg]:size-3.5',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
