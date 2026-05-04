CREATE TABLE `audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entity` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `metadata` JSON NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `audit_logs_userId_idx`(`userId`),
  INDEX `audit_logs_action_idx`(`action`),
  INDEX `audit_logs_entity_idx`(`entity`),
  INDEX `audit_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
