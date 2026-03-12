-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "resolution" TEXT NOT NULL DEFAULT '1080p',
    "frameRate" INTEGER NOT NULL DEFAULT 24,
    "format" TEXT NOT NULL DEFAULT 'mp4',
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "videos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_clips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 3000,
    "order" INTEGER NOT NULL DEFAULT 0,
    "videoId" TEXT NOT NULL,
    "shotId" TEXT,
    "storyboardId" TEXT,
    "videoUrl" TEXT,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiPrompt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "video_clips_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_clips_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "shots" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "video_clips_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "storyboards" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_tracks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "video_tracks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "track_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 3000,
    "content" TEXT NOT NULL,
    "style" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "track_items_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "video_tracks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_generation_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "projectId" TEXT NOT NULL,
    "videoId" TEXT,
    "clipId" TEXT,
    "params" TEXT,
    "resultUrl" TEXT,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "video_generation_tasks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "video_generation_tasks_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "video_clips" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
