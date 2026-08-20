-- AlterTable: add date_of_birth and gender to users
-- Both are nullable (no default needed, existing rows get NULL)
ALTER TABLE "users" ADD COLUMN "date_of_birth" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "gender" TEXT;
