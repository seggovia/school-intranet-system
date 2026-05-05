ALTER TABLE `school_requests`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
  ADD COLUMN `closedAt` DATETIME(3) NULL;

CREATE TABLE `request_comments` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `request_comments_requestId_idx`(`requestId`),
  INDEX `request_comments_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `request_status_logs` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `changedById` VARCHAR(191) NOT NULL,
  `fromStatus` VARCHAR(191) NOT NULL,
  `toStatus` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `request_status_logs_requestId_idx`(`requestId`),
  INDEX `request_status_logs_changedById_idx`(`changedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `request_comments`
  ADD CONSTRAINT `request_comments_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `school_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `request_comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `request_status_logs`
  ADD CONSTRAINT `request_status_logs_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `school_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `request_status_logs_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
