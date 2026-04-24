import { CalendarRepository } from './calendar.repository.js';

const repository = new CalendarRepository();

function serializeEvent(event: Awaited<ReturnType<CalendarRepository['createEvent']>>) {
  return {
    id: event.id,
    title: event.title,
    date: event.date.toISOString().slice(0, 10),
    type: event.type,
    location: event.location
  };
}

export class CalendarService {
  async listEvents() {
    const events = await repository.listEvents();
    return events.map(serializeEvent);
  }

  async createEvent(input: { title: string; date: Date; type: string; location: string }) {
    return serializeEvent(await repository.createEvent(input));
  }

  async listSchedules() {
    const schedules = await repository.listSchedules();
    return schedules.map((schedule) => ({
      id: schedule.id,
      course: `${schedule.section.course.name} ${schedule.section.name}`,
      subject: schedule.subject.name,
      teacher: schedule.teacher.user.name,
      classroom: schedule.classroom.name,
      weekday: schedule.weekday,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt
    }));
  }
}
