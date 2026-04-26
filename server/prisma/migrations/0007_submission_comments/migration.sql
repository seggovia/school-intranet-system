CREATE TABLE `submission_comments` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `submission_comments_submissionId_idx` (`submissionId`),
  INDEX `submission_comments_authorId_idx` (`authorId`),
  CONSTRAINT `submission_comments_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `assignment_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `submission_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
