-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 60,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capabilities" TEXT,
    "maxTokens" INTEGER,
    "contextWindow" INTEGER,
    "inputPrice" REAL,
    "outputPrice" REAL,
    "imagePrice" REAL,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_models_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_provider_configs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "providerId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "parameters" TEXT,
    "resultUrl" TEXT,
    "resultData" TEXT,
    "thumbnailUrl" TEXT,
    "error" TEXT,
    "errorCode" TEXT,
    "cost" REAL NOT NULL DEFAULT 0,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "generationTime" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "queuedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ai_tasks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_provider_configs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ai_tasks_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_ai_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "modelUrl" TEXT,
    "triggerWord" TEXT,
    "referenceImages" TEXT,
    "trainingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "trainingData" TEXT,
    "trainingCost" REAL NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "character_ai_models_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "characters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_characters" ("age", "appearance", "backView", "background", "createdAt", "description", "extraViews", "features", "frontView", "gender", "id", "name", "personality", "projectId", "sideView", "updatedAt") SELECT "age", "appearance", "backView", "background", "createdAt", "description", "extraViews", "features", "frontView", "gender", "id", "name", "personality", "projectId", "sideView", "updatedAt" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
CREATE TABLE "new_scenes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timeOfDay" TEXT,
    "atmosphere" TEXT,
    "style" TEXT,
    "wideShot" TEXT,
    "fullShot" TEXT,
    "mediumShot" TEXT,
    "closeUp" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiModelId" TEXT,
    "aiGenerationId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "scenes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_scenes" ("atmosphere", "closeUp", "createdAt", "description", "fullShot", "id", "mediumShot", "name", "projectId", "style", "timeOfDay", "updatedAt", "wideShot") SELECT "atmosphere", "closeUp", "createdAt", "description", "fullShot", "id", "mediumShot", "name", "projectId", "style", "timeOfDay", "updatedAt", "wideShot" FROM "scenes";
DROP TABLE "scenes";
ALTER TABLE "new_scenes" RENAME TO "scenes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_providerId_modelId_key" ON "ai_models"("providerId", "modelId");

-- CreateIndex
CREATE INDEX "ai_tasks_userId_status_idx" ON "ai_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "ai_tasks_projectId_type_idx" ON "ai_tasks"("projectId", "type");

-- CreateIndex
CREATE INDEX "ai_tasks_status_priority_createdAt_idx" ON "ai_tasks"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "ai_tasks_type_status_startedAt_idx" ON "ai_tasks"("type", "status", "startedAt");

-- CreateIndex
CREATE INDEX "character_ai_models_characterId_modelType_idx" ON "character_ai_models"("characterId", "modelType");
