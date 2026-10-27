-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Host" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Host" ("id", "name") SELECT "id", "name" FROM "Host";
DROP TABLE "Host";
ALTER TABLE "new_Host" RENAME TO "Host";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
