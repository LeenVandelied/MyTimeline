import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Table — tableau de données, DS Graphite (classe `.mt-table`).
 * En-têtes mono en capitales, lignes zébrées (états dans core.css).
 * Utiliser `scope="col"` sur les `<th>` et un `aria-label` sur `<Table>`.
 * `.mt-table__num` sur les cellules numériques (mono tabulaire, aligné à droite).
 */
const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn('mt-table', className)} {...props} />
  ),
)
Table.displayName = 'Table'

export { Table }
