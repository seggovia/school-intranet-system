CREATE TABLE `academic_periods` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `year` INTEGER NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `assessments`
  ADD COLUMN `periodId` VARCHAR(191) NULL,
  ADD INDEX `assessments_periodId_idx`(`periodId`);

ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `academic_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
