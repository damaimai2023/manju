/*
  Warnings:

  - You are about to drop the `character_ai_models` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "character_ai_models_characterId_modelType_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "character_ai_models";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'STOCK',
    "provider" TEXT NOT NULL,
    "providerVoiceId" TEXT,
    "cloneAudioUrl" TEXT,
    "cloneText" TEXT,
    "cloneStatus" TEXT NOT NULL DEFAULT 'NONE',
    "cloneTaskId" TEXT,
    "previewUrl" TEXT,
    "previewText" TEXT,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "gender" TEXT,
    "ageGroup" TEXT,
    "style" TEXT,
    "tags" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "voices_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "appearance" TEXT,
    "features" TEXT,
    "frontView" TEXT,
    "sideView" TEXT,
    "backView" TEXT,
    "extraViews" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiModelId" TEXT,
    "aiGenerationId" TEXT,
    "voiceId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "characters_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "voices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_characters" ("age", "aiGenerated", "aiGenerationId", "aiModelId", "aiPrompt", "appearance", "backView", "background", "createdAt", "description", "extraViews", "features", "frontView", "gender", "id", "name", "personality", "projectId", "sideView", "updatedAt") SELECT "age", "aiGenerated", "aiGenerationId", "aiModelId", "aiPrompt", "appearance", "backView", "background", "createdAt", "description", "extraViews", "features", "frontView", "gender", "id", "name", "personality", "projectId", "sideView", "updatedAt" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "voices_userId_type_idx" ON "voices"("userId", "type");

-- CreateIndex
CREATE INDEX "voices_projectId_idx" ON "voices"("projectId");
