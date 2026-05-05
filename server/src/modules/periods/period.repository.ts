import { prisma } from '../../config/db.js';

export class PeriodRepository {
  list() {
    return prisma.academicPeriod.findMany({ include: { _count: { select: { assessments: true } } }, orderBy: [{ year: 'desc' }, { startDate: 'asc' }] });
  }

  findById(id: string) {
    return prisma.academicPeriod.findUnique({ where: { id }, include: { _count: { select: { assessments: true } } } });
  }

  create(input: { name: string; year: number; startDate: Date; endDate: Date; isActive: boolean }) {
    return prisma.academicPeriod.create({ data: input, include: { _count: { select: { assessments: true } } } });
  }

  update(id: string, input: Partial<{ name: string; year: number; startDate: Date; endDate: Date; isActive: boolean }>) {
    return prisma.academicPeriod.update({ where: { id }, data: input, include: { _count: { select: { assessments: true } } } });
  }

  delete(id: string) {
    return prisma.academicPeriod.delete({ where: { id } });
  }

  findPeriodForDate(date: Date) {
    return prisma.academicPeriod.findFirst({ where: { startDate: { lte: date }, endDate: { gte: date }, isActive: true }, orderBy: { startDate: 'asc' } });
  }
}
