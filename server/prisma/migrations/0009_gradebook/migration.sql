ALTER TABLE `assessments`
  ADD COLUMN `sectionId` VARCHAR(191) NULL,
  ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'prueba',
  ADD COLUMN `description` TEXT NULL;

UPDATE `assessments` AS `a`
SET `a`.`sectionId` = (
  SELECT `ss`.`sectionId`
  FROM `subject_sections` AS `ss`
  WHERE `ss`.`subjectId` = `a`.`subjectId`
  LIMIT 1
)
WHERE `a`.`sectionId` IS NULL;

UPDATE `assessments` AS `a`
SET `a`.`sectionId` = (
  SELECT `s`.`id`
  FROM `sections` AS `s`
  LIMIT 1
)
WHERE `a`.`sectionId` IS NULL;

ALTER TABLE `assessments`
  MODIFY `sectionId` VARCHAR(191) NOT NULL;

ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_sectionId_fkey`
  FOREIGN KEY (`sectionId`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `grades`
  MODIFY `score` DOUBLE NULL,
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'con_nota',
  ADD COLUMN `comment` TEXT NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
