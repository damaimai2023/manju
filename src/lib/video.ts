import { ClipStatus, TaskStatus, VideoStatus } from "@/types";
import { prisma } from "@/lib/prisma";

/**
 * 格式化时长（毫秒转为 mm:ss 或 mm:ss.ms）
 */
export function formatDuration(ms: number, showMs = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (showMs) {
    const mss = milliseconds.toString().padStart(2, "0");
    return `${mm}:${ss}.${mss}`;
  }

  return `${mm}:${ss}`;
}

/**
 * 解析时长字符串（mm:ss 转为毫秒）
 */
export function parseDuration(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return (minutes * 60 + seconds) * 1000;
  }
  return 0;
}

/**
 * 获取视频状态标签样式
 */
export function getVideoStatusColor(status: VideoStatus): string {
  const colors: Record<VideoStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    EDITING: "bg-blue-100 text-blue-800",
    GENERATING: "bg-yellow-100 text-yellow-800",
    RENDERING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    EXPORTING: "bg-orange-100 text-orange-800",
    EXPORTED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * 获取片段状态标签样式
 */
export function getClipStatusColor(status: ClipStatus): string {
  const colors: Record<ClipStatus, string> = {
    PENDING: "bg-gray-100 text-gray-800",
    GENERATING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    UPLOADED: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * 获取任务状态标签样式
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    PENDING: "bg-gray-100 text-gray-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * 计算视频总时长
 */
export async function calculateVideoDuration(videoId: string): Promise<number> {
  const clips = await prisma.videoClip.findMany({
    where: { videoId },
    select: { duration: true },
  });

  return clips.reduce((total, clip) => total + clip.duration, 0);
}

/**
 * 更新视频时长
 */
export async function updateVideoDuration(videoId: string): Promise<void> {
  const duration = await calculateVideoDuration(videoId);
  await prisma.video.update({
    where: { id: videoId },
    data: { duration },
  });
}

/**
 * 重新排序片段
 */
export async function reorderClips(
  videoId: string,
  clipOrders: { id: string; order: number; startTime: number }[]
): Promise<void> {
  const updates = clipOrders.map(({ id, order, startTime }) =>
    prisma.videoClip.update({
      where: { id },
      data: { order, startTime },
    })
  );

  await prisma.$transaction(updates);
}

/**
 * 从分镜镜头创建视频片段
 */
export async function createClipsFromStoryboard(
  videoId: string,
  storyboardId: string
): Promise<void> {
  const shots = await prisma.shot.findMany({
    where: { storyboardId },
    include: {
      character: true,
      scene: true,
    },
    orderBy: { shotNo: "asc" },
  });

  let currentTime = 0;
  const clips = shots.map((shot, index) => {
    const duration = shot.duration ? shot.duration * 1000 : 3000; // 默认3秒
    const clip = {
      name: `镜头 ${shot.shotNo}`,
      startTime: currentTime,
      duration,
      order: index,
      videoId,
      shotId: shot.id,
      storyboardId,
      status: shot.generatedImage ? "UPLOADED" : ("PENDING" as ClipStatus),
      aiPrompt: shot.prompt,
      videoUrl: null,
      thumbnail: shot.generatedImage,
    };
    currentTime += duration;
    return clip;
  });

  await prisma.videoClip.createMany({
    data: clips,
  });

  // 更新视频时长
  await updateVideoDuration(videoId);
}

/**
 * 创建默认轨道
 */
export async function createDefaultTracks(videoId: string): Promise<void> {
  await prisma.videoTrack.createMany({
    data: [
      { type: "SUBTITLE", name: "台词字幕", videoId },
    ],
  });
}

/**
 * 生成视频片段缩略图（使用生成的图片或默认封面）
 */
export function generateThumbnailUrl(
  generatedImage: string | null,
  placeholder: string = "/images/video-placeholder.png"
): string {
  return generatedImage || placeholder;
}

/**
 * 检查视频是否可以导出
 */
export function canExportVideo(clips: { status: ClipStatus }[]): boolean {
  return clips.every(
    (clip) => clip.status === "COMPLETED" || clip.status === "UPLOADED"
  );
}

/**
 * 获取视频导出配置选项
 */
export const EXPORT_OPTIONS = {
  resolutions: [
    { value: "480p", label: "480p (SD)", width: 854, height: 480 },
    { value: "720p", label: "720p (HD)", width: 1280, height: 720 },
    { value: "1080p", label: "1080p (FHD)", width: 1920, height: 1080 },
    { value: "4K", label: "4K (UHD)", width: 3840, height: 2160 },
  ],
  frameRates: [
    { value: 24, label: "24 fps (电影)" },
    { value: 30, label: "30 fps (标准)" },
    { value: 60, label: "60 fps (流畅)" },
  ],
  formats: [
    { value: "mp4", label: "MP4 (推荐)" },
    { value: "webm", label: "WebM" },
    { value: "mov", label: "MOV" },
  ],
};

/**
 * 验证导出配置
 */
export function validateExportConfig(config: {
  resolution: string;
  frameRate: number;
  format: string;
}): boolean {
  const validResolution = EXPORT_OPTIONS.resolutions.some(
    (r) => r.value === config.resolution
  );
  const validFrameRate = EXPORT_OPTIONS.frameRates.some(
    (f) => f.value === config.frameRate
  );
  const validFormat = EXPORT_OPTIONS.formats.some(
    (f) => f.value === config.format
  );

  return validResolution && validFrameRate && validFormat;
}
