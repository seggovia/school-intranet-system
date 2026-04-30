import { useMemo, useState, type ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  pageSize = 8,
  emptyLabel = 'Sin registros para mostrar'
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  emptyLabel?: string;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = useMemo(() => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [currentPage, pageSize, rows]);

  return (
    <div className="data-table-block">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.header}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="table-empty">{emptyLabel}</div>}
      </div>
      {rows.length > pageSize && (
        <div className="table-pagination">
          <span>{rows.length} registros</span>
          <div>
            <button type="button" className="secondary-button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
            <strong>{currentPage} / {totalPages}</strong>
            <button type="button" className="secondary-button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
