ALTER TABLE `assignment_submissions`
  ADD COLUMN `teacherComment` TEXT NULL,
  ADD COLUMN `studentReply` TEXT NULL;

CREATE TABLE `submission_files` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `storagePath` VARCHAR(191) NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NULL,
  `size` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `submission_files`
  ADD INDEX `submission_files_submissionId_idx` (`submissionId`);

ALTER TABLE `submission_files`
  ADD CONSTRAINT `submission_files_submissionId_fkey`
  FOREIGN KEY (`submissionId`) REFERENCES `assignment_submissions`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
