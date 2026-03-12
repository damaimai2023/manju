/**
 * AI服务类型定义
 * Phase 1: 基础AI集成
 */

// ==================== 通用类型 ====================

export interface AiGenerationOptions {
  model: string;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, any>;
  callbackUrl?: string;
  webhookUrl?: string;
}

export interface AiGenerationResult {
  success: boolean;
  url?: string;
  urls?: string[]; // 批量生成
  data?: any;
  error?: string;
  errorCode?: string;
  cost: number;
  tokensUsed?: number;
  tokensInput?: number;
  tokensOutput?: number;
  generationTime?: number;
}

export interface AiStreamChunk {
  type: 'progress' | 'delta' | 'complete' | 'error';
  data?: any;
  progress?: number;
  error?: string;
}

// ==================== 图像生成 ====================

export interface ImageGenerationOptions extends AiGenerationOptions {
  width?: number;
  height?: number;
  aspectRatio?: string; // "1:1", "16:9", "9:16", etc.
  style?: string;
  quality?: 'standard' | 'hd' | 'ultra';
  seed?: number;
  numImages?: number; // 生成数量
  
  // 角色一致性
  characterReference?: string[]; // 参考图片URL
  characterModelId?: string; // LoRA/IP-Adapter模型ID
  
  // ControlNet
  controlNetImage?: string;
  controlNetType?: 'pose' | 'depth' | 'canny' | 'openpose';
  controlNetStrength?: number;
}

export interface ImageGenerationResult extends AiGenerationResult {
  width?: number;
  height?: number;
  seed?: number;
  revisedPrompt?: string; // AI优化后的提示词
}

// ==================== 视频生成 ====================

export interface VideoGenerationOptions extends AiGenerationOptions {
  width?: number;
  height?: number;
  duration?: number; // 秒
  frameRate?: number;
  
  // 输入类型
  imageUrl?: string; // 图生视频
  videoUrl?: string; // 视频编辑/延长
  
  // 运动控制
  motionStrength?: number; // 运动强度
  cameraMotion?: string; // 相机运动: "zoom_in", "pan_left", etc.
}

export interface VideoGenerationResult extends AiGenerationResult {
  width?: number;
  height?: number;
  duration?: number;
  frameRate?: number;
  thumbnailUrl?: string;
}

// ==================== 文本生成 ====================

export interface TextGenerationOptions extends AiGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  systemPrompt?: string;
  
  // 多模态
  images?: string[]; // 图片URL数组
}

export interface TextGenerationResult extends AiGenerationResult {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ==================== 音频生成 ====================

export interface AudioGenerationOptions extends AiGenerationOptions {
  voice?: string; // 声音ID
  voiceId?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg' | 'pcm';
  
  // 音乐生成
  genre?: string;
  tempo?: number;
  instrumental?: boolean;
  lyrics?: string;
}

export interface AudioGenerationResult extends AiGenerationResult {
  duration?: number;
  sampleRate?: number;
  format?: string;
}

// ==================== Provider配置 ====================

export interface ProviderConfig {
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  rateLimit?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'music' | 'multimodal';
  capabilities: string[];
  maxTokens?: number;
  contextWindow?: number;
  pricing: {
    input?: number;
    output?: number;
    image?: number;
  };
  config?: Record<string, any>;
}

// ==================== 任务管理 ====================

export interface TaskPriority {
  level: number; // 0-10
  name: string;
}

export const TaskPriorities: Record<string, TaskPriority> = {
  CRITICAL: { level: 10, name: '关键' },
  HIGH: { level: 7, name: '高' },
  NORMAL: { level: 5, name: '正常' },
  LOW: { level: 3, name: '低' },
  BACKGROUND: { level: 1, name: '后台' },
};

// ==================== 成本追踪 ====================

export interface CostEstimate {
  model: string;
  operation: string;
  estimatedCost: number;
  currency: string;
  breakdown?: {
    inputTokens?: number;
    outputTokens?: number;
    images?: number;
    videos?: number;
  };
}

// ==================== 错误类型 ====================

export enum AiErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 认证错误
  INVALID_API_KEY = 'INVALID_API_KEY',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  
  // 内容错误
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  INVALID_PROMPT = 'INVALID_PROMPT',
  UNSUPPORTED_PARAMETERS = 'UNSUPPORTED_PARAMETERS',
  
  // 资源错误
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_OVERLOADED = 'MODEL_OVERLOADED',
  
  // 生成错误
  GENERATION_FAILED = 'GENERATION_FAILED',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
}

export class AiError extends Error {
  constructor(
    message: string,
    public code: AiErrorCode = AiErrorCode.UNKNOWN,
    public provider?: string,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AiError';
  }
}
