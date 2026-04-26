ALTER TABLE `assignment_submissions`
  ADD COLUMN `grade` DOUBLE NULL,
  ADD COLUMN `feedback` TEXT NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewedById` VARCHAR(191) NULL;

ALTER TABLE `assignment_submissions`
  ADD INDEX `assignment_submissions_reviewedById_idx` (`reviewedById`);

ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `assignment_submissions_reviewedById_fkey`
  FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
