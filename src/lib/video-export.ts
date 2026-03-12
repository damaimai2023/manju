import { prisma } from "@/lib/prisma";
import { TaskStatus, VideoStatus } from "@/types";
import { updateTaskStatus, createGenerationTask } from "./ai-video";

/**
 * 视频导出配置
 */
interface ExportConfig {
  resolution: "480p" | "720p" | "1080p" | "4K";
  frameRate: 24 | 30 | 60;
  format: "mp4" | "webm" | "mov";
  quality?: "low" | "medium" | "high";
}

/**
 * 分辨率映射
 */
const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K": { width: 3840, height: 2160 },
};

/**
 * 导出视频
 * 在实际应用中，这里应该使用FFmpeg或其他视频处理库
 */
export async function exportVideo(
  videoId: string,
  config: ExportConfig
): Promise<string> {
  // 获取视频信息
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      clips: {
        orderBy: { order: "asc" },
      },
      tracks: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!video) {
    throw new Error("视频不存在");
  }

  // 检查所有片段是否已准备就绪
  const unreadyClips = video.clips.filter(
    (clip) => clip.status !== "COMPLETED" && clip.status !== "UPLOADED"
  );

  if (unreadyClips.length > 0) {
    throw new Error(`有 ${unreadyClips.length} 个片段尚未准备就绪`);
  }

  // 创建导出任务
  const taskId = await createGenerationTask(
    video.projectId,
    "EXPORT_VIDEO",
    videoId,
    undefined,
    config
  );

  // 异步执行导出
  processExport(taskId, videoId, config).catch(console.error);

  return taskId;
}

/**
 * 处理视频导出
 */
async function processExport(
  taskId: string,
  videoId: string,
  config: ExportConfig
): Promise<void> {
  try {
    // 更新视频状态为导出中
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EXPORTING" as VideoStatus },
    });

    // 更新任务状态
    await updateTaskStatus(taskId, "PROCESSING", 10);

    // 获取视频片段
    const clips = await prisma.videoClip.findMany({
      where: { videoId },
      orderBy: { order: "asc" },
    });

    // 模拟导出过程
    // 在实际应用中，这里会使用FFmpeg合并视频片段

    // 进度更新：准备资源
    await updateTaskStatus(taskId, "PROCESSING", 20);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 进度更新：处理视频轨道
    await updateTaskStatus(taskId, "PROCESSING", 40);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 进度更新：处理音轨
    await updateTaskStatus(taskId, "PROCESSING", 60);
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 进度更新：合成字幕
    await updateTaskStatus(taskId, "PROCESSING", 80);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 进度更新：最终渲染
    await updateTaskStatus(taskId, "PROCESSING", 95);
    await new Promise((resolve) => setTimeout(resolve, 700));

    // 生成导出文件URL
    const exportUrl = `/uploads/videos/export-${videoId}-${Date.now()}.${config.format}`;

    // 更新任务状态为完成
    await updateTaskStatus(taskId, "COMPLETED", 100, exportUrl);

    // 更新视频状态为已导出
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EXPORTED" as VideoStatus },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "导出失败";
    await updateTaskStatus(taskId, "FAILED", 0, undefined, errorMessage);

    // 更新视频状态为失败
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "FAILED" as VideoStatus },
    });

    throw error;
  }
}

/**
 * 验证导出配置
 */
export function validateExportConfig(config: ExportConfig): boolean {
  const validResolutions = ["480p", "720p", "1080p", "4K"];
  const validFrameRates = [24, 30, 60];
  const validFormats = ["mp4", "webm", "mov"];

  return (
    validResolutions.includes(config.resolution) &&
    validFrameRates.includes(config.frameRate) &&
    validFormats.includes(config.format)
  );
}

/**
 * 获取导出配置默认值
 */
export function getDefaultExportConfig(): ExportConfig {
  return {
    resolution: "1080p",
    frameRate: 24,
    format: "mp4",
    quality: "high",
  };
}

/**
 * 获取推荐配置
 */
export function getRecommendedConfig(
  targetPlatform: "web" | "mobile" | "social" | "archive"
): ExportConfig {
  switch (targetPlatform) {
    case "web":
      return {
        resolution: "720p",
        frameRate: 30,
        format: "mp4",
        quality: "medium",
      };
    case "mobile":
      return {
        resolution: "720p",
        frameRate: 30,
        format: "mp4",
        quality: "medium",
      };
    case "social":
      return {
        resolution: "1080p",
        frameRate: 30,
        format: "mp4",
        quality: "high",
      };
    case "archive":
      return {
        resolution: "1080p",
        frameRate: 24,
        format: "mov",
        quality: "high",
      };
    default:
      return getDefaultExportConfig();
  }
}

/**
 * 估算导出文件大小
 */
export function estimateFileSize(
  duration: number, // 毫秒
  config: ExportConfig
): number {
  // 粗略估算：每秒钟的文件大小（MB）
  const bitrateMap: Record<string, number> = {
    "480p": 2.5,
    "720p": 5,
    "1080p": 10,
    "4K": 35,
  };

  const durationInSeconds = duration / 1000;
  const baseBitrate = bitrateMap[config.resolution] || 10;
  const frameRateFactor = config.frameRate / 30;

  return Math.round(durationInSeconds * baseBitrate * frameRateFactor);
}

/**
 * 获取导出进度信息
 */
export async function getExportProgress(taskId: string): Promise<{
  status: TaskStatus;
  progress: number;
  resultUrl?: string;
  error?: string;
}> {
  const task = await prisma.videoGenerationTask.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error("任务不存在");
  }

  return {
    status: task.status as TaskStatus,
    progress: task.progress,
    resultUrl: task.resultUrl || undefined,
    error: task.error || undefined,
  };
}

/**
 * 取消导出
 */
export async function cancelExport(taskId: string): Promise<boolean> {
  const task = await prisma.videoGenerationTask.findUnique({
    where: { id: taskId },
  });

  if (!task || task.status !== "PENDING" && task.status !== "PROCESSING") {
    return false;
  }

  // 在实际应用中，这里应该中断FFmpeg进程
  await prisma.videoGenerationTask.update({
    where: { id: taskId },
    data: { status: "FAILED", error: "用户取消导出" },
  });

  // 恢复视频状态
  if (task.videoId) {
    await prisma.video.update({
      where: { id: task.videoId },
      data: { status: "COMPLETED" },
    });
  }

  return true;
}

/**
 * 预览导出效果
 * 在实际应用中，这里可以生成一个低分辨率的预览版本
 */
export async function previewExport(
  videoId: string
): Promise<{ previewUrl: string; duration: number }> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      clips: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!video) {
    throw new Error("视频不存在");
  }

  // 模拟预览URL
  const previewUrl = `/api/videos/${videoId}/preview`;

  return {
    previewUrl,
    duration: video.duration,
  };
}
