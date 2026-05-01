import { AlertTriangle } from 'lucide-react';
import { EvalColumnHeader } from './EvalColumnHeader';
import { GradeCell, formatGrade, gradeTone } from './GradeCell';
import type { GradebookEvaluation, GradebookTableRow } from '../types';

function cellKey(evaluationId: string, studentId: string) {
  return `${evaluationId}:${studentId}`;
}

function columnAverage(rows: GradebookTableRow[], evaluationId: string) {
  const scores = rows
    .map((row) => row.scores[evaluationId])
    .filter((cell) => cell?.status === 'con_nota' && cell.score !== null)
    .map((cell) => Number(cell.score));
  return scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1)) : null;
}

function courseAverage(rows: GradebookTableRow[]) {
  const averages = rows.map((row) => row.finalAverage).filter((value): value is number => value !== null);
  return averages.length ? Number((averages.reduce((sum, value) => sum + value, 0) / averages.length).toFixed(1)) : null;
}

export function GradebookTable({
  evaluations,
  rows,
  editable = false,
  dirtyCells = new Set<string>(),
  cellErrors = {},
  cellDrafts = {},
  onScoreChange,
  onEditEvaluation,
  onDeleteEvaluation
}: {
  evaluations: GradebookEvaluation[];
  rows: GradebookTableRow[];
  editable?: boolean;
  dirtyCells?: Set<string>;
  cellErrors?: Record<string, string>;
  cellDrafts?: Record<string, string>;
  onScoreChange?: (evaluation: GradebookEvaluation, row: GradebookTableRow, value: string) => void;
  onEditEvaluation?: (evaluation: GradebookEvaluation) => void;
  onDeleteEvaluation?: (evaluation: GradebookEvaluation) => void;
}) {
  function navigate(rowIndex: number, colIndex: number) {
    const target = document.querySelector<HTMLInputElement>(`[data-grade-cell="${rowIndex}:${colIndex}"]`);
    target?.focus();
    target?.select();
  }

  const generalAverage = courseAverage(rows);

  return (
    <div className="gradebook-spreadsheet-wrap">
      <table className="gradebook-spreadsheet">
        <thead>
          <tr>
            <th className="sticky-col student-col">Estudiante</th>
            {evaluations.map((evaluation) => (
              <th key={evaluation.id} className="evaluation-col">
                <EvalColumnHeader evaluation={evaluation} onEdit={onEditEvaluation} onDelete={onDeleteEvaluation} />
              </th>
            ))}
            <th className="sticky-col-right average-col">Promedio<br /><small>ponderado</small></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              <th className="sticky-col student-col row-student" scope="row">
                <span>
                  {row.academicRisk && (
                    <span className="gradebook-risk-icon" title="Estudiante en riesgo académico" aria-label="Estudiante en riesgo académico">
                      <AlertTriangle size={15} />
                    </span>
                  )}
                  {row.student}
                </span>
              </th>
              {evaluations.map((evaluation, colIndex) => {
                const key = cellKey(evaluation.id, row.studentId);
                const cell = row.scores[evaluation.id];
                return (
                  <td key={evaluation.id} className="grade-entry-cell">
                    {editable && onScoreChange ? (
                      <GradeCell
                        value={cell?.status === 'con_nota' ? cell.score : null}
                        draft={cellDrafts[key]}
                        error={cellErrors[key]}
                        hasUnsavedChange={dirtyCells.has(key)}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        onChange={(value) => onScoreChange(evaluation, row, value)}
                        onNavigate={navigate}
                      />
                    ) : (
                      <span className={`readonly-grade grade-tone-${gradeTone(cell?.score ?? null)}`}>{formatGrade(cell?.score ?? null)}</span>
                    )}
                  </td>
                );
              })}
              <td className="sticky-col-right average-col">
                <strong className={`weighted-average grade-tone-${gradeTone(row.finalAverage)}`} title={row.averageDetail}>
                  {formatGrade(row.finalAverage)}
                </strong>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky-col student-col">Promedio evaluación</th>
            {evaluations.map((evaluation) => {
              const average = columnAverage(rows, evaluation.id);
              return <td key={evaluation.id} className={`column-average grade-tone-${gradeTone(average)}`}>{formatGrade(average)}</td>;
            })}
            <td className={`sticky-col-right average-col column-average grade-tone-${gradeTone(generalAverage)}`}>{formatGrade(generalAverage)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
