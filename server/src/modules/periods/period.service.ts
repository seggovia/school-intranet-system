import { HttpError } from '../../shared/http-error.js';
import { PeriodRepository } from './period.repository.js';

const repository = new PeriodRepository();

function serialize(period: Awaited<ReturnType<PeriodRepository['create']>>) {
  return {
    id: period.id,
    name: period.name,
    year: period.year,
    startDate: period.startDate.toISOString().slice(0, 10),
    endDate: period.endDate.toISOString().slice(0, 10),
    isActive: period.isActive,
    assessments: period._count.assessments,
    createdAt: period.createdAt.toISOString()
  };
}

export class PeriodService {
  async list() {
    const periods = await repository.list();
    return periods.map(serialize);
  }

  async create(input: { name: string; year: number; startDate: Date; endDate: Date; isActive: boolean }) {
    return serialize(await repository.create(input));
  }

  async update(id: string, input: Partial<{ name: string; year: number; startDate: Date; endDate: Date; isActive: boolean }>) {
    const current = await repository.findById(id);
    if (!current) throw new HttpError(404, 'Periodo academico no encontrado.');
    const startDate = input.startDate ?? current.startDate;
    const endDate = input.endDate ?? current.endDate;
    if (endDate < startDate) throw new HttpError(400, 'La fecha de termino debe ser posterior al inicio.');
    return serialize(await repository.update(id, input));
  }

  async delete(id: string) {
    const current = await repository.findById(id);
    if (!current) throw new HttpError(404, 'Periodo academico no encontrado.');
    if (current._count.assessments > 0) throw new HttpError(409, 'No se puede eliminar un periodo con evaluaciones asociadas.');
    await repository.delete(id);
    return { ok: true };
  }
}
