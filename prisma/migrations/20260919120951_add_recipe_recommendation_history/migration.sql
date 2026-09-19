-- CreateTable
CREATE TABLE `tbl_recipe_recommendation_history` (
    `recommendation_history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `member_id` INTEGER NOT NULL,
    `recipe_id` INTEGER NOT NULL,
    `recipe_title` VARCHAR(191) NOT NULL,
    `normalized_title` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tbl_recipe_recommendation_history_member_id_normalized_title_key`(`member_id`, `normalized_title`),
    PRIMARY KEY (`recommendation_history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tbl_recipe_recommendation_history` ADD CONSTRAINT `tbl_recipe_recommendation_history_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `tbl_member`(`member_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_recipe_recommendation_history` ADD CONSTRAINT `tbl_recipe_recommendation_history_recipe_id_fkey` FOREIGN KEY (`recipe_id`) REFERENCES `tbl_recipe`(`recipe_id`) ON DELETE CASCADE ON UPDATE CASCADE;
