/**
 * AI Provider 抽象基类
 * Phase 1: 基础AI集成
 */

import {
  AiGenerationOptions,
  AiGenerationResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
  TextGenerationOptions,
  TextGenerationResult,
  AudioGenerationOptions,
  AudioGenerationResult,
  ProviderConfig,
  ModelInfo,
  AiError,
  AiErrorCode,
} from './types';

export abstract class BaseAiProvider {
  protected config: ProviderConfig;
  protected abstract readonly defaultBaseUrl: string;
  
  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      rateLimit: 60,
      ...config,
    };
  }

  // ==================== 基础属性 ====================

  get name(): string {
    return this.config.name;
  }

  get provider(): string {
    return this.config.provider;
  }

  get isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  // ==================== 抽象方法 ====================

  /**
   * 获取支持的模型列表
   */
  abstract getModels(): ModelInfo[];

  /**
   * 检查是否支持特定模型
   */
  abstract supportsModel(model: string): boolean;

  /**
   * 生成图像
   */
  abstract generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;

  /**
   * 生成视频
   */
  abstract generateVideo?(options: VideoGenerationOptions): Promise<VideoGenerationResult>;

  /**
   * 生成文本
   */
  abstract generateText?(options: TextGenerationOptions): Promise<TextGenerationResult>;

  /**
   * 生成音频/TTS
   */
  abstract generateAudio?(options: AudioGenerationOptions): Promise<AudioGenerationResult>;

  /**
   * 估算成本
   */
  abstract estimateCost(model: string, input: any): number;

  // ==================== 通用方法 ====================

  /**
   * 计算Token数量 (文本模型)
   */
  protected estimateTokens(text: string): number {
    // 粗略估算: 1 token ≈ 4个字符 (中文) 或 0.75个单词 (英文)
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 延迟函数
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 指数退避重试
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.config.maxRetries!
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // 检查是否是可重试的错误
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // 指数退避: 2^i * 1000ms
        const delayMs = Math.pow(2, i) * 1000;
        console.warn(`[${this.name}] Retry ${i + 1}/${retries} after ${delayMs}ms`);
        await this.delay(delayMs);
      }
    }
    
    throw lastError;
  }

  /**
   * 判断错误是否可重试
   */
  protected isRetryableError(error: any): boolean {
    // 网络错误、超时、限流、模型过载等可以重试
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'NETWORK_ERROR',
      'TIMEOUT',
      'RATE_LIMITED',
      'MODEL_OVERLOADED',
      429, // Too Many Requests
      503, // Service Unavailable
      504, // Gateway Timeout
    ];
    
    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }
    
    if (error.status && retryableCodes.includes(error.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * 处理API错误
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${this.name}] ${context}:`, error);
    
    // 提取错误信息
    const message = error.message || error.error?.message || 'Unknown error';
    const status = error.status || error.statusCode;
    const code = error.code;
    
    // 映射到标准错误码
    let errorCode = AiErrorCode.UNKNOWN;
    let retryable = false;
    
    if (status === 401 || code === 'invalid_api_key') {
      errorCode = AiErrorCode.INVALID_API_KEY;
    } else if (status === 429 || code === 'rate_limit_exceeded') {
      errorCode = AiErrorCode.RATE_LIMITED;
      retryable = true;
    } else if (status === 400 && message.includes('content')) {
      errorCode = AiErrorCode.CONTENT_FILTERED;
    } else if (code === 'insufficient_quota') {
      errorCode = AiErrorCode.INSUFFICIENT_CREDITS;
    } else if (code === 'timeout' || status === 504) {
      errorCode = AiErrorCode.TIMEOUT;
      retryable = true;
    } else if (this.isRetryableError(error)) {
      retryable = true;
    }
    
    throw new AiError(message, errorCode, this.provider, retryable, error);
  }

  /**
   * 标准化图像结果
   */
  protected createImageResult(
    url: string,
    cost: number,
    options: ImageGenerationOptions,
    metadata?: any
  ): ImageGenerationResult {
    return {
      success: true,
      url,
      cost,
      width: options.width || 1024,
      height: options.height || 1024,
      ...metadata,
    };
  }

  /**
   * 创建失败结果
   */
  protected createErrorResult(error: any, cost: number = 0): AiGenerationResult {
    return {
      success: false,
      error: error.message || String(error),
      errorCode: error.code,
      cost,
    };
  }
}

/**
 * Provider工厂
 */
export class ProviderFactory {
  private static providers = new Map<string, new (config: ProviderConfig) => BaseAiProvider>();

  static register(name: string, providerClass: new (config: ProviderConfig) => BaseAiProvider) {
    this.providers.set(name, providerClass);
  }

  static create(config: ProviderConfig): BaseAiProvider {
    const ProviderClass = this.providers.get(config.provider);
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${config.provider}`);
    }
    return new ProviderClass(config);
  }

  static listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
