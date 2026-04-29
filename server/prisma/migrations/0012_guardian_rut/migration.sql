ALTER TABLE `guardians` ADD COLUMN `rut` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `guardians_rut_key` ON `guardians`(`rut`);
