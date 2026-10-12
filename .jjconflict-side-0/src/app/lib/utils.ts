import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const mergeClasses = extendTailwindMerge({
  extend: {
    // External tailwind-merge configuration key.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    classGroups: {
      'font-size': [
        { text: ['h1', 'figure', 'metric', 'title', 'body', 'nav1', 'nav2', 'subtitle'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs))
}
