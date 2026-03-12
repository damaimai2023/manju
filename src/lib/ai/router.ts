/**
 * AI Router - 智能路由中心
 * 负责: 模型选择、成本优化、负载均衡、故障转移
 */

import { prisma } from '@/lib/prisma';
import { BaseAiProvider, ProviderFactory } from './base-provider';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  TextGenerationOptions,
  TextGenerationResult,
  AudioGenerationOptions,
  AudioGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
  ModelInfo,
  ModelType,
  AiTaskType,
  TaskPriority,
  CostEstimate,
} from './types';

// Provider实例缓存
const providerCache = new Map<string, BaseAiProvider>();

interface RouterConfig {
  // 成本优化
  costOptimization: boolean;
  maxCostPerRequest: number;
  
  // 质量偏好
  qualityPreference: 'speed' | 'balanced' | 'quality';
  
  // 故障转移
  enableFallback: boolean;
  fallbackModels: string[];
  
  // 缓存
  enableCache: boolean;
  cacheTTL: number; // 秒
}

const defaultConfig: RouterConfig = {
  costOptimization: true,
  maxCostPerRequest: 1.0, // $1.00
  qualityPreference: 'balanced',
  enableFallback: true,
  fallbackModels: ['gpt-4o-mini', 'claude-3-haiku-20240307'],
  enableCache: true,
  cacheTTL: 3600, // 1小时
};

/**
 * 获取Provider实例
 */
async function getProvider(providerId: string): Promise<BaseAiProvider> {
  // 检查缓存
  if (providerCache.has(providerId)) {
    return providerCache.get(providerId)!;
  }

  // 从数据库获取配置
  const config = await prisma.aiProviderConfig.findUnique({
    where: { id: providerId },
  });

  if (!config || !config.isActive) {
    throw new Error(`Provider not found or inactive: ${providerId}`);
  }

  // 创建实例
  const provider = ProviderFactory.create({
    name: config.name,
    provider: config.provider,
    apiKey: config.apiKey || '',
    baseUrl: config.baseUrl || undefined,
    rateLimit: config.rateLimit,
  });

  providerCache.set(providerId, provider);
  return provider;
}

/**
 * 清除Provider缓存
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * 获取活跃的Provider列表
 */
export async function getActiveProviders(): Promise<BaseAiProvider[]> {
  const configs = await prisma.aiProviderConfig.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  const providers: BaseAiProvider[] = [];
  for (const config of configs) {
    try {
      const provider = await getProvider(config.id);
      if (provider.isAvailable) {
        providers.push(provider);
      }
    } catch (error) {
      console.warn(`Failed to load provider ${config.name}:`, error);
    }
  }

  return providers;
}

/**
 * 获取所有可用模型
 */
export async function getAvailableModels(type?: ModelType): Promise<ModelInfo[]> {
  const models = await prisma.aiModel.findMany({
    where: {
      isActive: true,
      ...(type && { type }),
    },
    include: { provider: true },
    orderBy: { updatedAt: 'desc' },
  });

  return models.map(m => ({
    id: m.modelId,
    name: m.name,
    provider: m.provider.provider,
    type: m.type.toLowerCase() as ModelType,
    capabilities: JSON.parse(m.capabilities || '[]'),
    maxTokens: m.maxTokens || undefined,
    contextWindow: m.contextWindow || undefined,
    pricing: {
      input: m.inputPrice || undefined,
      output: m.outputPrice || undefined,
      image: m.imagePrice || undefined,
    },
    config: m.config ? JSON.parse(m.config) : undefined,
  }));
}

/**
 * 智能选择模型
 */
export async function selectModel(
  type: ModelType,
  taskType: AiTaskType,
  preference: 'cost' | 'speed' | 'quality' = 'balanced',
  projectId?: string
): Promise<{ modelId: string; providerId: string; estimatedCost: number }> {
  // 获取可用模型
  const models = await prisma.aiModel.findMany({
    where: {
      isActive: true,
      type,
      provider: { isActive: true },
    },
    include: { provider: true },
  });

  if (models.length === 0) {
    throw new Error(`No available models for type: ${type}`);
  }

  // 评分函数
  const scoreModel = (model: typeof models[0]): number => {
    let score = 0;
    
    // 基础价格评分 (越低越好)
    const avgPrice = ((model.inputPrice || 0) + (model.outputPrice || 0) + (model.imagePrice || 0)) / 3;
    const priceScore = avgPrice > 0 ? 100 / (avgPrice * 1000 + 1) : 50;
    
    // 质量评分 (根据模型名和配置)
    let qualityScore = 50;
    if (model.modelId.includes('gpt-4') || model.modelId.includes('claude-3-opus')) {
      qualityScore = 100;
    } else if (model.modelId.includes('gpt-3.5') || model.modelId.includes('haiku')) {
      qualityScore = 70;
    }
    
    // 速度评分 (小模型通常更快)
    let speedScore = 50;
    if (model.modelId.includes('mini') || model.modelId.includes('haiku') || model.modelId.includes('turbo')) {
      speedScore = 100;
    }

    // 根据偏好加权
    switch (preference) {
      case 'cost':
        score = priceScore * 0.6 + qualityScore * 0.2 + speedScore * 0.2;
        break;
      case 'speed':
        score = speedScore * 0.5 + priceScore * 0.3 + qualityScore * 0.2;
        break;
      case 'quality':
        score = qualityScore * 0.6 + priceScore * 0.2 + speedScore * 0.2;
        break;
      default:
        score = priceScore * 0.4 + qualityScore * 0.3 + speedScore * 0.3;
    }
    
    // 优先选择默认模型
    if (model.isDefault) score += 10;
    
    return score;
  };

  // 排序并选择最佳模型
  const sortedModels = models
    .map(m => ({ ...m, score: scoreModel(m) }))
    .sort((a, b) => b.score - a.score);

  const bestModel = sortedModels[0];
  
  // 估算成本
  let estimatedCost = 0;
  if (bestModel.imagePrice) {
    estimatedCost = bestModel.imagePrice;
  } else if (bestModel.inputPrice && bestModel.outputPrice) {
    estimatedCost = (bestModel.inputPrice + bestModel.outputPrice) / 1000;
  }

  return {
    modelId: bestModel.modelId,
    providerId: bestModel.providerId,
    estimatedCost,
  };
}

/**
 * 生成图像 (智能路由)
 */
export async function generateImage(
  options: ImageGenerationOptions,
  config: Partial<RouterConfig> = {}
): Promise<ImageGenerationResult> {
  const cfg = { ...defaultConfig, ...config };
  
  // 如果指定了模型，直接使用
  if (options.model) {
    // 查找模型对应的provider
    const model = await prisma.aiModel.findFirst({
      where: { modelId: options.model, isActive: true },
      include: { provider: true },
    });

    if (!model) {
      return {
        success: false,
        error: `Model not found: ${options.model}`,
        cost: 0,
      };
    }

    const provider = await getProvider(model.providerId);
    return provider.generateImage(options);
  }

  // 智能选择模型
  const selection = await selectModel('IMAGE', AiTaskType.CHARACTER_GENERATE, 
    cfg.qualityPreference === 'speed' ? 'speed' : 
    cfg.qualityPreference === 'quality' ? 'quality' : 'balanced'
  );

  options.model = selection.modelId;
  
  const provider = await getProvider(selection.providerId);
  const result = await provider.generateImage(options);
  
  // 记录成本
  await recordUsage(selection.providerId, 'image', result.cost);
  
  return result;
}

/**
 * 生成文本 (智能路由)
 */
export async function generateText(
  options: TextGenerationOptions,
  config: Partial<RouterConfig> = {}
): Promise<TextGenerationResult> {
  const cfg = { ...defaultConfig, ...config };
  
  if (options.model) {
    const model = await prisma.aiModel.findFirst({
      where: { modelId: options.model, isActive: true },
      include: { provider: true },
    });

    if (!model) {
      return {
        success: false,
        error: `Model not found: ${options.model}`,
        text: '',
        cost: 0,
      };
    }

    const provider = await getProvider(model.providerId);
    return provider.generateText!(options);
  }

  const selection = await selectModel('TEXT', AiTaskType.DESCRIPTION_ENHANCE,
    cfg.qualityPreference === 'speed' ? 'cost' : 'balanced'
  );

  options.model = selection.modelId;
  
  const provider = await getProvider(selection.providerId);
  const result = await provider.generateText!(options);
  
  await recordUsage(selection.providerId, 'text', result.cost);
  
  return result;
}

/**
 * 生成音频/TTS (智能路由)
 */
export async function generateAudio(
  options: import('./types').AudioGenerationOptions,
  config: Partial<RouterConfig> = {}
): Promise<import('./types').AudioGenerationResult> {
  const cfg = { ...defaultConfig, ...config };
  
  if (options.model) {
    const model = await prisma.aiModel.findFirst({
      where: { modelId: options.model, isActive: true },
      include: { provider: true },
    });

    if (!model) {
      return {
        success: false,
        error: `Model not found: ${options.model}`,
        cost: 0,
      };
    }

    const provider = await getProvider(model.providerId);
    if (!provider.generateAudio) {
      return {
        success: false,
        error: `Provider does not support audio generation: ${model.provider.name}`,
        cost: 0,
      };
    }
    return provider.generateAudio(options);
  }

  // 智能选择模型 - 优先选择阿里云TTS
  const selection = await selectModel('AUDIO', AiTaskType.AUDIO_TTS, 'balanced');

  options.model = selection.modelId;
  
  const provider = await getProvider(selection.providerId);
  if (!provider.generateAudio) {
    return {
      success: false,
      error: `Selected provider does not support audio generation`,
      cost: 0,
    };
  }
  
  const result = await provider.generateAudio(options);
  
  await recordUsage(selection.providerId, 'audio', result.cost);
  
  return result;
}

/**
 * 估算成本
 */
export async function estimateCost(
  type: ModelType,
  modelId: string,
  input: any
): Promise<CostEstimate> {
  const model = await prisma.aiModel.findFirst({
    where: { modelId, isActive: true },
    include: { provider: true },
  });

  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const provider = await getProvider(model.providerId);
  const cost = provider.estimateCost(modelId, input);

  return {
    model: modelId,
    operation: type,
    estimatedCost: cost,
    currency: 'USD',
    breakdown: {
      inputTokens: input.tokensInput,
      outputTokens: input.tokensOutput,
      images: input.numImages,
    },
  };
}

/**
 * 记录API使用
 */
async function recordUsage(
  providerId: string,
  operation: string,
  cost: number
): Promise<void> {
  try {
    await prisma.apiUsage.create({
      data: {
        userId: 'system', // 应该从上下文获取
        provider: 'OPENAI', // 需要从provider映射
        operation,
        cost,
      },
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}

/**
 * 初始化默认Provider和模型
 */
export async function initializeAiProviders(): Promise<void> {
  // 检查是否已有配置
  const existingCount = await prisma.aiProviderConfig.count();
  if (existingCount > 0) {
    console.log('AI providers already initialized');
    return;
  }

  console.log('Initializing default AI providers...');

  // 创建默认Provider配置
  const providers = [
    {
      name: 'OpenAI',
      provider: 'openai',
      rateLimit: 60,
      priority: 10,
    },
    {
      name: 'Stability AI',
      provider: 'stability-ai',
      rateLimit: 30,
      priority: 8,
    },
    {
      name: 'Anthropic',
      provider: 'anthropic',
      rateLimit: 40,
      priority: 9,
    },
  ];

  for (const p of providers) {
    const created = await prisma.aiProviderConfig.create({
      data: p,
    });

    // 为每个Provider创建默认模型
    if (p.provider === 'openai') {
      await prisma.aiModel.createMany({
        data: [
          {
            providerId: created.id,
            modelId: 'gpt-4o',
            name: 'GPT-4o',
            type: 'MULTIMODAL',
            capabilities: JSON.stringify(['text-generation', 'vision', 'function-calling']),
            maxTokens: 4096,
            contextWindow: 128000,
            inputPrice: 2.5,
            outputPrice: 10,
            isDefault: true,
          },
          {
            providerId: created.id,
            modelId: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            type: 'MULTIMODAL',
            capabilities: JSON.stringify(['text-generation', 'vision']),
            maxTokens: 4096,
            contextWindow: 128000,
            inputPrice: 0.15,
            outputPrice: 0.6,
          },
          {
            providerId: created.id,
            modelId: 'dall-e-3',
            name: 'DALL-E 3',
            type: 'IMAGE',
            capabilities: JSON.stringify(['image-generation', 'prompt-rewrite']),
            imagePrice: 0.04,
            isDefault: true,
          },
          {
            providerId: created.id,
            modelId: 'tts-1',
            name: 'TTS-1',
            type: 'AUDIO',
            capabilities: JSON.stringify(['text-to-speech']),
            inputPrice: 0.015,
          },
        ],
      });
    } else if (p.provider === 'stability-ai') {
      await prisma.aiModel.createMany({
        data: [
          {
            providerId: created.id,
            modelId: 'sd3.5-large',
            name: 'Stable Diffusion 3.5 Large',
            type: 'IMAGE',
            capabilities: JSON.stringify(['image-generation', 'text-in-image']),
            imagePrice: 0.065,
          },
          {
            providerId: created.id,
            modelId: 'sd3.5-large-turbo',
            name: 'SD 3.5 Large Turbo',
            type: 'IMAGE',
            capabilities: JSON.stringify(['image-generation', 'fast']),
            imagePrice: 0.04,
            isDefault: true,
          },
        ],
      });
    } else if (p.provider === 'anthropic') {
      await prisma.aiModel.createMany({
        data: [
          {
            providerId: created.id,
            modelId: 'claude-3-7-sonnet-20250219',
            name: 'Claude 3.7 Sonnet',
            type: 'MULTIMODAL',
            capabilities: JSON.stringify(['text-generation', 'vision', 'code-generation']),
            maxTokens: 8192,
            contextWindow: 200000,
            inputPrice: 3,
            outputPrice: 15,
            isDefault: true,
          },
          {
            providerId: created.id,
            modelId: 'claude-3-5-haiku-20241022',
            name: 'Claude 3.5 Haiku',
            type: 'MULTIMODAL',
            capabilities: JSON.stringify(['text-generation', 'vision', 'fast']),
            maxTokens: 4096,
            contextWindow: 200000,
            inputPrice: 0.8,
            outputPrice: 4,
          },
        ],
      });
    } else if (p.provider === 'aliyun') {
      await prisma.aiModel.createMany({
        data: [
          {
            providerId: created.id,
            modelId: 'cosyvoice-v1',
            name: 'CosyVoice 长文本合成',
            type: 'AUDIO',
            capabilities: JSON.stringify(['text-to-speech', 'long-text', 'emotion-control']),
            outputPrice: 0.02,
            isDefault: true,
          },
          {
            providerId: created.id,
            modelId: 'cosyvoice-clone',
            name: 'CosyVoice 音色克隆',
            type: 'AUDIO',
            capabilities: JSON.stringify(['voice-clone', 'text-to-speech']),
            outputPrice: 0.05,
          },
          {
            providerId: created.id,
            modelId: 'sambert-zh-cn',
            name: 'Sambert 中文标准',
            type: 'AUDIO',
            capabilities: JSON.stringify(['text-to-speech', 'fast', 'preset-voices']),
            outputPrice: 0.015,
          },
        ],
      });
    }
  }

  console.log('AI providers initialized successfully');
}
