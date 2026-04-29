ALTER TABLE `class_schedules`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX `class_schedules_teacherId_weekday_startsAt_endsAt_idx`
  ON `class_schedules`(`teacherId`, `weekday`, `startsAt`, `endsAt`);

CREATE INDEX `class_schedules_classroomId_weekday_startsAt_endsAt_idx`
  ON `class_schedules`(`classroomId`, `weekday`, `startsAt`, `endsAt`);

CREATE INDEX `class_schedules_sectionId_weekday_startsAt_endsAt_idx`
  ON `class_schedules`(`sectionId`, `weekday`, `startsAt`, `endsAt`);
