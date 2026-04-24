import { prisma } from '../../config/db.js';

export class CalendarRepository {
  listEvents() {
    return prisma.calendarEvent.findMany({ orderBy: { date: 'asc' } });
  }

  createEvent(input: { title: string; date: Date; type: string; location: string }) {
    return prisma.calendarEvent.create({ data: input });
  }

  listSchedules() {
    return prisma.classSchedule.findMany({
      include: { section: { include: { course: true } }, subject: true, teacher: { include: { user: true } }, classroom: true },
      orderBy: [{ weekday: 'asc' }, { startsAt: 'asc' }]
    });
  }
}
