ALTER TABLE `courses` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `sections` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `classrooms` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX `courses_levelId_name_key` ON `courses`(`levelId`, `name`);
