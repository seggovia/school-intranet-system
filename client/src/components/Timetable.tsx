import type { ScheduleItem } from '../types';
import { Link } from 'react-router-dom';

const weekdays = [1, 2, 3, 4, 5];
const weekdayLabels = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

export function Timetable({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="timetable">
      {weekdays.map((day) => (
        <div className="timetable-day" key={day}>
          <strong>{items.find((item) => item.weekday === day)?.weekdayName ?? weekdayLabels[day - 1]}</strong>
          {items.filter((item) => item.weekday === day).map((item) => (
            <Link className="time-block" key={item.id} to={`/subjects/${item.subjectId}`}>
              <span>{item.startsAt} - {item.endsAt}</span>
              <b>{item.subject}</b>
              <small>{item.section} - {item.classroom}</small>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
