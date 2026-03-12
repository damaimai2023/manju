// ==================== 用户相关 ====================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  provider: AiProvider;
  isActive: boolean;
  createdAt: string;
}

export type AiProvider = "OPENAI" | "STABLE_DIFFUSION" | "MIDJOURNEY" | "DALLE" | "CUSTOM";

// ==================== 项目相关 ====================

export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  status: ProjectStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  characterCount?: number;
  sceneCount?: number;
  storyboardCount?: number;
}

// ==================== 角色管理 ====================

export interface CharacterAppearance {
  hair: {
    style: string;
    color: string;
    length: string;
    features?: string[];
  };
  face: {
    shape: string;
    eyes: {
      color: string;
      shape: string;
    };
    nose?: string;
    mouth?: string;
  };
  body?: {
    height?: number;
    build?: string;
  };
  clothing?: {
    top: string;
    bottom?: string;
    accessories?: string[];
  };
}

export interface Character {
  id: string;
  name: string;
  description: string | null;
  age: number | null;
  gender: string | null;
  appearance: CharacterAppearance | null;
  features: Record<string, any> | null;
  frontView: string | null;
  sideView: string | null;
  backView: string | null;
  extraViews: string[];
  personality: string | null;
  background: string | null;
  voiceId: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 场景管理 ====================

export interface Scene {
  id: string;
  name: string;
  description: string | null;
  timeOfDay: string | null;
  atmosphere: string | null;
  style: string | null;
  wideShot: string | null;
  fullShot: string | null;
  mediumShot: string | null;
  closeUp: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 道具管理 ====================

export interface Prop {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 剧集管理 ====================

export interface Episode {
  id: string;
  episodeNo: number;
  title: string;
  description: string | null;
  script: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== 分镜管理 ====================

export type ShotSize = "EXTREME_LONG" | "LONG" | "FULL" | "MEDIUM" | "CLOSE_UP" | "EXTREME_CLOSE";
export type CameraAngle = "EYE_LEVEL" | "LOW_ANGLE" | "HIGH_ANGLE" | "DUTCH_ANGLE" | "OVER_SHOULDER";
export type CameraMove = "STATIC" | "PAN" | "TILT" | "DOLLY" | "TRUCK" | "CRANE";
export type ShotStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";

export const ShotSizeLabels: Record<ShotSize, string> = {
  EXTREME_LONG: "大远景",
  LONG: "远景",
  FULL: "全景",
  MEDIUM: "中景",
  CLOSE_UP: "近景",
  EXTREME_CLOSE: "特写",
};

export const CameraAngleLabels: Record<CameraAngle, string> = {
  EYE_LEVEL: "平视",
  LOW_ANGLE: "仰视",
  HIGH_ANGLE: "俯视",
  DUTCH_ANGLE: "斜角",
  OVER_SHOULDER: "过肩",
};

export const CameraMoveLabels: Record<CameraMove, string> = {
  STATIC: "固定",
  PAN: "摇",
  TILT: "俯仰",
  DOLLY: "推拉",
  TRUCK: "横移",
  CRANE: "升降",
};

export interface Storyboard {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  episodeId: string | null;
  createdAt: string;
  updatedAt: string;
  shotCount?: number;
}

export interface Shot {
  id: string;
  shotNo: number;
  shotSize: ShotSize;
  cameraAngle: CameraAngle;
  cameraMove: CameraMove;
  duration: number | null;
  description: string | null;
  dialogue: string | null;
  narration: string | null;
  action: string | null;
  characterId: string | null;
  character?: Character;
  sceneId: string | null;
  scene?: Scene;
  propIds: string[];
  prompt: string | null;
  generatedImage: string | null;
  status: ShotStatus;
  storyboardId: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== AI 生成 ====================

export interface AIGenerationParams {
  prompt: string;
  negativePrompt?: string;
  style: "anime" | "realistic" | "sketch" | "watercolor";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  referenceImages?: string[];
  characterConsistency?: boolean;
  seed?: number;
}

// ==================== 表单相关 ====================

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface CreateCharacterInput {
  name: string;
  description?: string;
  age?: number;
  gender?: string;
  appearance?: CharacterAppearance;
}

export interface CreateSceneInput {
  name: string;
  description?: string;
  timeOfDay?: string;
  atmosphere?: string;
  style?: string;
}

export interface CreateStoryboardInput {
  name: string;
  description?: string;
  episodeId?: string;
}

export interface CreateShotInput {
  shotSize: ShotSize;
  cameraAngle: CameraAngle;
  cameraMove?: CameraMove;
  duration?: number;
  description?: string;
  dialogue?: string;
  narration?: string;
  action?: string;
  characterId?: string;
  sceneId?: string;
  propIds?: string[];
}

// ==================== 视频管理 ====================

export type VideoStatus = "DRAFT" | "EDITING" | "GENERATING" | "RENDERING" | "COMPLETED" | "EXPORTING" | "EXPORTED" | "FAILED";
export type ClipStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED" | "UPLOADED";
export type TrackType = "AUDIO" | "SUBTITLE";
export type TaskType = "GENERATE_CLIP" | "EXPORT_VIDEO";
export type TaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export const VideoStatusLabels: Record<VideoStatus, string> = {
  DRAFT: "草稿",
  EDITING: "编辑中",
  GENERATING: "生成中",
  RENDERING: "渲染中",
  COMPLETED: "已完成",
  EXPORTING: "导出中",
  EXPORTED: "已导出",
  FAILED: "失败",
};

export const ClipStatusLabels: Record<ClipStatus, string> = {
  PENDING: "待生成",
  GENERATING: "生成中",
  COMPLETED: "已完成",
  FAILED: "失败",
  UPLOADED: "已上传",
};

export const TrackTypeLabels: Record<TrackType, string> = {
  AUDIO: "音频",
  SUBTITLE: "字幕",
};

export const TaskTypeLabels: Record<TaskType, string> = {
  GENERATE_CLIP: "生成片段",
  EXPORT_VIDEO: "导出视频",
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  PENDING: "等待中",
  PROCESSING: "处理中",
  COMPLETED: "已完成",
  FAILED: "失败",
};

export interface Video {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  duration: number;
  status: VideoStatus;
  resolution: string;
  frameRate: number;
  format: string;
  projectId: string;
  clips: VideoClip[];
  tracks: VideoTrack[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  order: number;
  videoId: string;
  shotId: string | null;
  shot?: Shot;
  storyboardId: string | null;
  storyboard?: Storyboard;
  videoUrl: string | null;
  thumbnail: string | null;
  status: ClipStatus;
  aiPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoTrack {
  id: string;
  type: TrackType;
  name: string;
  videoId: string;
  items: TrackItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackItem {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  content: string;
  style: string | null;
}

export interface VideoGenerationTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  projectId: string;
  videoId: string | null;
  clipId: string | null;
  params: Record<string, any> | null;
  resultUrl: string | null;
  error: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoInput {
  name: string;
  description?: string;
  storyboardId?: string;
}

export interface UpdateVideoInput {
  name?: string;
  description?: string;
  resolution?: string;
  frameRate?: number;
}

export interface GenerateVideoInput {
  shotId?: string;
  storyboardId?: string;
  style?: "anime" | "realistic" | "sketch" | "watercolor";
  duration?: number;
}

export interface CreateClipInput {
  name: string;
  shotId?: string;
  storyboardId?: string;
  duration?: number;
}

export interface UpdateClipInput {
  name?: string;
  startTime?: number;
  duration?: number;
  order?: number;
}