/**
 * Dhruto — DataTable row typing helper.
 * ------------------------------------------------------------------
 * `DataTable` (from `@dhruto/ui`) hands each cell renderer the full TanStack
 * `CellContext` (`{ row: Row<T>, ... }`). Feature tables only ever read
 * `row.original`, so this narrow structural type keeps cell renderers typed without importing
 * `@tanstack/react-table` into the application (it is a transitive dependency
 * of the UI package, not a declared one here).
 */
export type DataTableRow<TData> = { row: { original: TData } };
