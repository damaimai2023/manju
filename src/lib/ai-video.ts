import { prisma } from "@/lib/prisma";
import { ClipStatus, TaskStatus, TaskType } from "@/types";

// AI视频生成配置
const AI_VIDEO_CONFIG = {
  // 模拟生成延迟（毫秒）
  simulateDelay: 3000,
  // 默认片段时长（毫秒）
  defaultDuration: 3000,
};

/**
 * AI视频生成参数
 */
interface VideoGenerationParams {
  prompt: string;
  referenceImage?: string;
  style?: "anime" | "realistic" | "sketch" | "watercolor";
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * 创建视频生成任务
 */
export async function createGenerationTask(
  projectId: string,
  type: TaskType,
  videoId?: string,
  clipId?: string,
  params?: Record<string, any>
): Promise<string> {
  const task = await prisma.videoGenerationTask.create({
    data: {
      type,
      status: "PENDING",
      projectId,
      videoId: videoId || null,
      clipId: clipId || null,
      params: params ? JSON.stringify(params) : null,
      progress: 0,
    },
  });

  return task.id;
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  progress?: number,
  resultUrl?: string,
  error?: string
): Promise<void> {
  const data: any = { status };
  if (progress !== undefined) data.progress = progress;
  if (resultUrl !== undefined) data.resultUrl = resultUrl;
  if (error !== undefined) data.error = error;

  await prisma.videoGenerationTask.update({
    where: { id: taskId },
    data,
  });
}

/**
 * 获取任务信息
 */
export async function getTask(taskId: string) {
  return prisma.videoGenerationTask.findUnique({
    where: { id: taskId },
  });
}

/**
 * 更新片段状态
 */
export async function updateClipStatus(
  clipId: string,
  status: ClipStatus,
  videoUrl?: string
): Promise<void> {
  const data: any = { status };
  if (videoUrl !== undefined) data.videoUrl = videoUrl;

  await prisma.videoClip.update({
    where: { id: clipId },
    data,
  });
}

/**
 * 更新视频状态
 */
export async function updateVideoStatus(
  videoId: string,
  status: string
): Promise<void> {
  await prisma.video.update({
    where: { id: videoId },
    data: { status },
  });
}

/**
 * 生成AI视频（模拟实现）
 * 在实际应用中，这里应该调用Runway、Pika Labs、Stable Video Diffusion等API
 */
export async function generateVideo(
  taskId: string,
  params: VideoGenerationParams
): Promise<string> {
  // 更新任务状态为处理中
  await updateTaskStatus(taskId, "PROCESSING", 10);

  try {
    // 模拟AI视频生成过程
    // 在实际应用中，这里会调用外部AI服务API

    // 进度更新：准备中
    await updateTaskStatus(taskId, "PROCESSING", 20);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 进度更新：分析提示词
    await updateTaskStatus(taskId, "PROCESSING", 40);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 进度更新：生成中
    await updateTaskStatus(taskId, "PROCESSING", 70);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 进度更新：后处理
    await updateTaskStatus(taskId, "PROCESSING", 90);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 生成完成，返回模拟的视频URL
    // 实际应用中，这里应该返回AI服务生成的真实视频URL
    const resultUrl = `/uploads/videos/generated-${Date.now()}.mp4`;

    await updateTaskStatus(taskId, "COMPLETED", 100, resultUrl);

    return resultUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "生成失败";
    await updateTaskStatus(taskId, "FAILED", 0, undefined, errorMessage);
    throw error;
  }
}

/**
 * 处理片段生成任务
 */
export async function processClipGeneration(
  taskId: string,
  clipId: string,
  params: VideoGenerationParams
): Promise<void> {
  // 更新片段状态为生成中
  await updateClipStatus(clipId, "GENERATING");

  try {
    // 执行AI生成
    const videoUrl = await generateVideo(taskId, params);

    // 更新片段状态为完成
    await updateClipStatus(clipId, "COMPLETED", videoUrl);
  } catch (error) {
    // 更新片段状态为失败
    await updateClipStatus(clipId, "FAILED");
    throw error;
  }
}

/**
 * 批量生成片段
 */
export async function batchGenerateClips(
  videoId: string,
  clipIds: string[],
  style?: "anime" | "realistic" | "sketch" | "watercolor"
): Promise<string[]> {
  const tasks: string[] = [];

  for (const clipId of clipIds) {
    const clip = await prisma.videoClip.findUnique({
      where: { id: clipId },
      include: { shot: true },
    });

    if (!clip || !clip.shot) continue;

    const params: VideoGenerationParams = {
      prompt: clip.aiPrompt || clip.shot.prompt || "",
      referenceImage: clip.shot.generatedImage || undefined,
      style: style || "anime",
      duration: clip.duration,
    };

    const taskId = await createGenerationTask(
      clip.videoId, // 这里应该用projectId，需要查询video
      "GENERATE_CLIP",
      videoId,
      clipId,
      params
    );

    tasks.push(taskId);

    // 异步处理生成任务
    processClipGeneration(taskId, clipId, params).catch(console.error);
  }

  return tasks;
}

/**
 * 获取待处理的任务
 */
export async function getPendingTasks(limit: number = 10) {
  return prisma.videoGenerationTask.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * 获取视频的所有任务
 */
export async function getVideoTasks(videoId: string) {
  return prisma.videoGenerationTask.findMany({
    where: { videoId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 获取片段的所有任务
 */
export async function getClipTasks(clipId: string) {
  return prisma.videoGenerationTask.findMany({
    where: { clipId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 取消任务
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const task = await prisma.videoGenerationTask.findUnique({
    where: { id: taskId },
  });

  if (!task || task.status !== "PENDING") {
    return false;
  }

  await prisma.videoGenerationTask.update({
    where: { id: taskId },
    data: { status: "FAILED", error: "用户取消" },
  });

  return true;
}

/**
 * 清理过期任务
 */
export async function cleanupOldTasks(days: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.videoGenerationTask.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: ["COMPLETED", "FAILED"] },
    },
  });

  return result.count;
}

/**
 * 获取AI服务状态
 * 在实际应用中，这里应该检查外部AI服务的健康状态
 */
export async function getAIServiceStatus(): Promise<{
  available: boolean;
  message: string;
}> {
  // 模拟AI服务状态
  return {
    available: true,
    message: "AI视频生成服务正常运行",
  };
}

/**
 * 估算生成成本
 * 在实际应用中，这里应该根据实际使用的AI服务计算成本
 */
export function estimateGenerationCost(
  clipCount: number,
  duration: number
): number {
  // 模拟成本计算：每个片段每秒钟0.1美元
  const costPerSecond = 0.1;
  const totalSeconds = (clipCount * duration) / 1000;
  return Math.round(totalSeconds * costPerSecond * 100) / 100;
}
