/**
 * Stability AI Provider 实现
 * 支持: Stable Diffusion 3, SDXL, FLUX, Stable Video
 */

import { BaseAiProvider, ProviderFactory } from '../base-provider';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
  ModelInfo,
  ProviderConfig,
  AiError,
  AiErrorCode,
} from '../types';

interface StabilityApiResponse {
  artifacts: Array<{
    base64: string;
    seed: number;
    finishReason: string;
  }>;
}

export class StabilityAiProvider extends BaseAiProvider {
  protected readonly defaultBaseUrl = 'https://api.stability.ai/v2beta';
  private apiKey: string;

  // 模型定价 (每1000张)
  private readonly pricing: Record<string, { image: number }> = {
    'sd3.5-large': { image: 0.065 },
    'sd3.5-large-turbo': { image: 0.04 },
    'sd3-medium': { image: 0.035 },
    'sd3-large': { image: 0.065 },
    'sdxl-1.0': { image: 0.03 },
    'stable-image-ultra': { image: 0.08 },
    'stable-image-core': { image: 0.03 },
  };

  // 模型能力映射
  private readonly modelCapabilities: Record<string, string[]> = {
    'sd3.5-large': ['image-generation', 'prompt-adherence', 'text-in-image'],
    'sd3.5-large-turbo': ['image-generation', 'fast-generation'],
    'sd3-medium': ['image-generation', 'balanced-quality'],
    'sdxl-1.0': ['image-generation', 'anime', 'photorealistic'],
    'stable-image-ultra': ['image-generation', 'high-quality', 'commercial'],
    'stable-image-core': ['image-generation', 'fast', 'cost-effective'],
  };

  constructor(config: ProviderConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  // ==================== 模型信息 ====================

  getModels(): ModelInfo[] {
    return [
      {
        id: 'sd3.5-large',
        name: 'Stable Diffusion 3.5 Large',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['sd3.5-large'],
        pricing: this.pricing['sd3.5-large'],
      },
      {
        id: 'sd3.5-large-turbo',
        name: 'SD 3.5 Large Turbo',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['sd3.5-large-turbo'],
        pricing: this.pricing['sd3.5-large-turbo'],
      },
      {
        id: 'sd3-medium',
        name: 'Stable Diffusion 3 Medium',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['sd3-medium'],
        pricing: this.pricing['sd3-medium'],
      },
      {
        id: 'sdxl-1.0',
        name: 'Stable Diffusion XL 1.0',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['sdxl-1.0'],
        pricing: this.pricing['sdxl-1.0'],
      },
      {
        id: 'stable-image-ultra',
        name: 'Stable Image Ultra',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['stable-image-ultra'],
        pricing: this.pricing['stable-image-ultra'],
      },
      {
        id: 'stable-image-core',
        name: 'Stable Image Core',
        provider: 'stability-ai',
        type: 'image',
        capabilities: this.modelCapabilities['stable-image-core'],
        pricing: this.pricing['stable-image-core'],
      },
    ];
  }

  supportsModel(model: string): boolean {
    return Object.keys(this.pricing).includes(model);
  }

  // ==================== 图像生成 ====================

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model || 'sd3.5-large';
      
      // 构建尺寸
      let width = options.width || 1024;
      let height = options.height || 1024;
      
      // 根据aspectRatio调整
      if (options.aspectRatio) {
        const ratioMap: Record<string, { w: number; h: number }> = {
          '1:1': { w: 1024, h: 1024 },
          '16:9': { w: 1344, h: 768 },
          '9:16': { w: 768, h: 1344 },
          '4:3': { w: 1024, h: 768 },
          '3:4': { w: 768, h: 1024 },
          '21:9': { w: 1536, h: 640 },
        };
        const ratio = ratioMap[options.aspectRatio];
        if (ratio) {
          width = ratio.w;
          height = ratio.h;
        }
      }

      // 构建请求体
      const body: Record<string, any> = {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || '',
        width,
        height,
        seed: options.seed || Math.floor(Math.random() * 2147483647),
        cfg_scale: options.parameters?.cfgScale || 7,
        samples: options.numImages || 1,
        steps: options.parameters?.steps || 40,
      };

      // 添加风格
      if (options.style) {
        body.style_preset = this.mapStyleToPreset(options.style);
      }

      // 调用API
      const response = await this.withRetry(async () => {
        const endpoint = this.getEndpoint(model);
        const res = await fetch(`${this.config.baseUrl || this.defaultBaseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error(error.message || `HTTP ${res.status}`);
        }

        return res.json() as Promise<StabilityApiResponse>;
      });

      const generationTime = Date.now() - startTime;
      const cost = this.calculateCost(model, options.numImages || 1);

      // 处理结果
      const urls = response.artifacts
        .filter(a => a.finishReason === 'SUCCESS')
        .map(a => `data:image/png;base64,${a.base64}`);

      if (urls.length === 0) {
        throw new Error('Generation failed: no successful artifacts');
      }

      return {
        success: true,
        url: urls[0],
        urls,
        cost,
        generationTime,
        width,
        height,
        seed: body.seed,
      };
    } catch (error) {
      return this.createErrorResult(error) as ImageGenerationResult;
    }
  }

  // ==================== 视频生成 (如可用) ====================

  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Stability AI Stable Video Diffusion
      if (!options.imageUrl) {
        throw new Error('Image URL is required for video generation');
      }

      // 这里调用Stable Video API
      // 由于API可能较复杂，这里提供简化实现
      const response = await this.withRetry(async () => {
        const res = await fetch(`${this.config.baseUrl || this.defaultBaseUrl}/image-to-video`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            image: options.imageUrl,
            seed: options.parameters?.seed || 0,
            cfg_scale: options.parameters?.cfgScale || 7,
            motion_bucket_id: options.motionStrength || 127,
          }),
        });

        if (!res.ok) {
          throw new Error(`Video generation failed: ${res.status}`);
        }

        return res.json();
      });

      const generationTime = Date.now() - startTime;

      return {
        success: true,
        url: response.video_url,
        cost: 0.1, // 视频生成成本较高
        generationTime,
        width: options.width || 1024,
        height: options.height || 576,
        duration: options.duration || 4,
      };
    } catch (error) {
      return this.createErrorResult(error) as VideoGenerationResult;
    }
  }

  // ==================== 辅助方法 ====================

  private getEndpoint(model: string): string {
    // 不同模型使用不同端点
    if (model.startsWith('stable-image')) {
      return 'stable-image/generate/' + model.replace('stable-image-', '');
    }
    return `stable-image/generate/sd3`;
  }

  private mapStyleToPreset(style: string): string {
    const styleMap: Record<string, string> = {
      'anime': 'anime',
      'photorealistic': 'photographic',
      'digital-art': 'digital-art',
      'cinematic': 'cinematic',
      'fantasy': 'fantasy-art',
      'line-art': 'line-art',
      'low-poly': 'low-poly',
      'modeling': 'modeling-compound',
      'origami': 'origami',
      'pixel-art': 'pixel-art',
      'tile-texture': 'tile-texture',
    };
    return styleMap[style] || 'photographic';
  }

  // ==================== 成本计算 ====================

  estimateCost(model: string, input: any): number {
    if (model.startsWith('sd') || model.startsWith('stable-image')) {
      return this.calculateCost(model, input.numImages || 1);
    }
    return 0;
  }

  private calculateCost(model: string, numImages: number): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    
    return pricing.image * numImages;
  }
}

// 注册Provider
ProviderFactory.register('stability-ai', StabilityAiProvider);
