import { Fragment, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  renderRow,
  className,
}: {
  caption: string
  columns: readonly { key: string; label: ReactNode; numeric?: boolean }[]
  rows: readonly T[]
  rowKey: (row: T) => string
  renderRow: (row: T) => ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-base border-2 border-border bg-secondary-background',
        className,
      )}
    >
      <table className="w-full min-w-[38rem] text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('p-3', column.numeric && 'text-right')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={rowKey(row)}>{renderRow(row)}</Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResponsiveCollection({ wide, narrow }: { wide: ReactNode; narrow: ReactNode }) {
  return (
    <>
      <div className="max-md:hidden print:hidden print:block">{wide}</div>
      <div className="md:hidden print:hidden">{narrow}</div>
    </>
  )
}
