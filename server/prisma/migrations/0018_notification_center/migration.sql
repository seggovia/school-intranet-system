ALTER TABLE `notifications`
  ADD COLUMN `message` TEXT NULL,
  ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'system';

UPDATE `notifications`
SET `message` = `body`
WHERE `message` IS NULL;

ALTER TABLE `notifications`
  MODIFY `message` TEXT NOT NULL;

ALTER TABLE `notifications`
  DROP COLUMN `body`;
