-- Rename username to userId.
DROP INDEX "User_username_key";
ALTER TABLE "User" RENAME COLUMN "username" TO "userId";
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "applicationName" TEXT;

-- Machine-to-machine applications stored their name in email.
UPDATE "User" SET "applicationName" = "email", "email" = NULL WHERE "userId" LIKE '%@clients';
