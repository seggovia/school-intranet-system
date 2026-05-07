CREATE TABLE `student_observations` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NULL,
  `body` TEXT NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'neutral',
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `student_observations_studentId_idx`(`studentId`),
  INDEX `student_observations_sectionId_idx`(`sectionId`),
  INDEX `student_observations_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `student_observations`
  ADD CONSTRAINT `student_observations_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `student_observations`
  ADD CONSTRAINT `student_observations_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `student_observations`
  ADD CONSTRAINT `student_observations_sectionId_fkey`
  FOREIGN KEY (`sectionId`) REFERENCES `sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
