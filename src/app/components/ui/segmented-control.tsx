import { cn } from '@/lib/utils'

/**
 * A bordered group of buttons for choosing one of a few options, per
 * spec/ui/design-system.md#forms (§5 of the inventory guideline additions):
 * use instead of a <select> when there are <=4 options and seeing them
 * helps (bed type, Schlafraum).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  className?: string
}) {
  return (
    <div className={cn('grid gap-1', className)}>
      <span className="font-bold">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-base border-2 border-black max-sm:grid-flow-row max-sm:grid-cols-1"
      >
        {options.map((option, index) => {
          const selected = option.value === value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 px-3 font-bold sm:min-h-11',
                'max-sm:flex-col max-sm:min-h-14 max-sm:gap-0.5',
                index > 0 && 'border-l-2 border-black max-sm:border-l-0 max-sm:border-t-2',
                selected ? 'bg-black text-white' : 'bg-white text-foreground',
              )}
            >
              {Icon ? <Icon className="size-5" /> : null}
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
