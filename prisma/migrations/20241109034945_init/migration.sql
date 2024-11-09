-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationName" TEXT NOT NULL,
    "containerName" TEXT NOT NULL,
    "isInResponseChain" BOOLEAN NOT NULL DEFAULT false,
    "isUpdatable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("applicationName", "containerName", "createdAt", "id", "isUpdatable", "updatedAt") SELECT "applicationName", "containerName", "createdAt", "id", "isUpdatable", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
