CREATE TABLE `announcement_reads` (
  `id` VARCHAR(191) NOT NULL,
  `announcementId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `announcement_reads_announcementId_userId_key`(`announcementId`, `userId`),
  INDEX `announcement_reads_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `announcement_reads`
  ADD CONSTRAINT `announcement_reads_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `announcements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `announcement_reads_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
