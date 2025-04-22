/*
  Warnings:

  - Made the column `hostId` on table `Server` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationName" TEXT NOT NULL,
    "containerName" TEXT NOT NULL,
    "isInResponseChain" BOOLEAN NOT NULL DEFAULT false,
    "isUpdatable" BOOLEAN NOT NULL DEFAULT false,
    "hostId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Server_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Server" ("applicationName", "containerName", "createdAt", "hostId", "id", "isInResponseChain", "isUpdatable", "updatedAt") SELECT "applicationName", "containerName", "createdAt", "hostId", "id", "isInResponseChain", "isUpdatable", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
