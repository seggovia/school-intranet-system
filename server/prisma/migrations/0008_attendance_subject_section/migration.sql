ALTER TABLE `attendance`
  ADD COLUMN `subjectId` VARCHAR(191) NULL,
  ADD COLUMN `sectionId` VARCHAR(191) NULL,
  ADD COLUMN `recordedById` VARCHAR(191) NULL,
  ADD COLUMN `updatedById` VARCHAR(191) NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

UPDATE `attendance` a
JOIN `enrollments` e ON e.`id` = a.`enrollmentId`
JOIN (
  SELECT `sectionId`, MIN(`subjectId`) AS `subjectId`
  FROM `subject_sections`
  GROUP BY `sectionId`
) ss ON ss.`sectionId` = e.`sectionId`
SET a.`sectionId` = e.`sectionId`, a.`subjectId` = ss.`subjectId`;

DELETE FROM `attendance` WHERE `sectionId` IS NULL OR `subjectId` IS NULL;

ALTER TABLE `attendance` ADD INDEX `attendance_studentId_idx`(`studentId`);

ALTER TABLE `attendance` DROP INDEX `attendance_studentId_date_key`;

ALTER TABLE `attendance`
  MODIFY `subjectId` VARCHAR(191) NOT NULL,
  MODIFY `sectionId` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `attendance_studentId_subjectId_sectionId_date_key`(`studentId`, `subjectId`, `sectionId`, `date`),
  ADD INDEX `attendance_subjectId_idx`(`subjectId`),
  ADD INDEX `attendance_sectionId_idx`(`sectionId`),
  ADD INDEX `attendance_recordedById_idx`(`recordedById`),
  ADD INDEX `attendance_updatedById_idx`(`updatedById`);

ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `attendance_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
