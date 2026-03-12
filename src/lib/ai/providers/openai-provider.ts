/**
 * OpenAI Provider 实现
 * 支持: GPT-4o, DALL-E 3, TTS, Whisper
 */

import OpenAI from 'openai';
import { BaseAiProvider, ProviderFactory } from '../base-provider';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  TextGenerationOptions,
  TextGenerationResult,
  AudioGenerationOptions,
  AudioGenerationResult,
  ModelInfo,
  ProviderConfig,
  AiErrorCode,
} from '../types';

export class OpenAiProvider extends BaseAiProvider {
  protected readonly defaultBaseUrl = 'https://api.openai.com/v1';
  private client: OpenAI;

  // 模型定价 (每1000单位)
  private readonly pricing = {
    // 文本模型
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    // 图像模型
    'dall-e-3': { image: 0.04 }, // 1024x1024 标准质量
    'dall-e-3-hd': { image: 0.08 }, // 1024x1024 HD
    'dall-e-2': { image: 0.02 },
    // 音频模型
    'tts-1': { audio: 0.015 }, // 每1000字符
    'tts-1-hd': { audio: 0.03 },
    'whisper-1': { audio: 0.006 }, // 每分钟
  };

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || this.defaultBaseUrl,
      timeout: config.timeout,
      maxRetries: 0, // 我们自己处理重试
    });
  }

  // ==================== 模型信息 ====================

  getModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'function-calling', 'json-mode'],
        maxTokens: 4096,
        contextWindow: 128000,
        pricing: this.pricing['gpt-4o'],
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'function-calling'],
        maxTokens: 4096,
        contextWindow: 128000,
        pricing: this.pricing['gpt-4o-mini'],
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai',
        type: 'image',
        capabilities: ['image-generation', 'prompt-rewrite'],
        pricing: this.pricing['dall-e-3'],
      },
      {
        id: 'tts-1',
        name: 'TTS-1',
        provider: 'openai',
        type: 'audio',
        capabilities: ['text-to-speech'],
        pricing: this.pricing['tts-1'],
      },
      {
        id: 'tts-1-hd',
        name: 'TTS-1 HD',
        provider: 'openai',
        type: 'audio',
        capabilities: ['text-to-speech', 'hd-voice'],
        pricing: this.pricing['tts-1-hd'],
      },
    ];
  }

  supportsModel(model: string): boolean {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 
            'dall-e-3', 'dall-e-2', 'tts-1', 'tts-1-hd'].includes(model);
  }

  // ==================== 图像生成 ====================

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model === 'dall-e-3-hd' ? 'dall-e-3' : (options.model || 'dall-e-3');
      const quality = options.model === 'dall-e-3-hd' ? 'hd' : (options.quality || 'standard');
      
      // 构建尺寸
      let size: string = '1024x1024';
      if (options.width && options.height) {
        size = `${options.width}x${options.height}`;
      } else if (options.aspectRatio) {
        const ratioMap: Record<string, string> = {
          '1:1': '1024x1024',
          '16:9': '1792x1024',
          '9:16': '1024x1792',
          '4:3': '1024x768',
          '3:4': '768x1024',
        };
        size = ratioMap[options.aspectRatio] || '1024x1024';
      }

      const response = await this.withRetry(async () => {
        return this.client.images.generate({
          model,
          prompt: options.prompt,
          n: options.numImages || 1,
          size: size as any,
          quality: quality as 'standard' | 'hd',
          response_format: 'url',
          style: options.style as 'vivid' | 'natural' || 'vivid',
          user: options.parameters?.user,
        });
      });

      const generationTime = Date.now() - startTime;
      const cost = this.calculateImageCost(model, quality, options.numImages || 1);
      
      // 提取修订后的提示词
      const revisedPrompt = response.data[0]?.revised_prompt;
      
      return {
        success: true,
        url: response.data[0]?.url || '',
        urls: response.data.map(d => d.url || ''),
        cost,
        generationTime,
        revisedPrompt,
        width: parseInt(size.split('x')[0]),
        height: parseInt(size.split('x')[1]),
      };
    } catch (error) {
      return this.createErrorResult(error) as ImageGenerationResult;
    }
  }

  // ==================== 文本生成 ====================

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model || 'gpt-4o-mini';
      
      // 构建消息
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      // 处理多模态输入
      if (options.images && options.images.length > 0) {
        const content: OpenAI.Chat.ChatCompletionContentPart[] = [
          { type: 'text', text: options.prompt },
          ...options.images.map(url => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'auto' as const },
          })),
        ];
        messages.push({ role: 'user', content });
      } else {
        messages.push({ role: 'user', content: options.prompt });
      }

      const response = await this.withRetry(async () => {
        return this.client.chat.completions.create({
          model,
          messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          stop: options.stopSequences,
          stream: false,
          response_format: options.parameters?.jsonMode ? { type: 'json_object' } : undefined,
        });
      });

      const generationTime = Date.now() - startTime;
      const usage = response.usage;
      const cost = this.calculateTextCost(model, usage?.prompt_tokens || 0, usage?.completion_tokens || 0);

      return {
        success: true,
        text: response.choices[0]?.message?.content || '',
        cost,
        generationTime,
        tokensInput: usage?.prompt_tokens,
        tokensOutput: usage?.completion_tokens,
        tokensUsed: usage?.total_tokens,
        finishReason: response.choices[0]?.finish_reason || undefined,
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.createErrorResult(error) as TextGenerationResult;
    }
  }

  // ==================== 音频生成 ====================

  async generateAudio(options: AudioGenerationOptions): Promise<AudioGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model || 'tts-1';
      const voice = options.voice || 'alloy';
      
      const mp3 = await this.withRetry(async () => {
        return this.client.audio.speech.create({
          model,
          voice: voice as any,
          input: options.prompt,
          speed: options.speed,
          response_format: options.format || 'mp3',
        });
      });

      // 获取音频数据并保存
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // 这里应该上传到文件存储服务，返回URL
      // 暂时返回模拟URL
      const url = `data:audio/mp3;base64,${buffer.toString('base64')}`;
      
      const generationTime = Date.now() - startTime;
      const cost = this.calculateAudioCost(model, options.prompt.length);

      return {
        success: true,
        url,
        cost,
        generationTime,
        format: options.format || 'mp3',
      };
    } catch (error) {
      return this.createErrorResult(error) as AudioGenerationResult;
    }
  }

  // ==================== 成本计算 ====================

  estimateCost(model: string, input: any): number {
    if (model.startsWith('gpt')) {
      return this.calculateTextCost(
        model, 
        input.tokensInput || this.estimateTokens(input.prompt || ''),
        input.tokensOutput || Math.ceil((input.maxTokens || 1000) * 0.7)
      );
    } else if (model.startsWith('dall')) {
      return this.calculateImageCost(model, input.quality || 'standard', input.numImages || 1);
    } else if (model.startsWith('tts')) {
      return this.calculateAudioCost(model, input.characters || 1000);
    }
    return 0;
  }

  private calculateTextCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.pricing[model as keyof typeof this.pricing] as { input: number; output: number } | undefined;
    if (!pricing) return 0;
    
    return (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output);
  }

  private calculateImageCost(model: string, quality: string, numImages: number): number {
    const pricingKey = quality === 'hd' ? 'dall-e-3-hd' : model;
    const pricing = this.pricing[pricingKey as keyof typeof this.pricing] as { image: number } | undefined;
    if (!pricing) return 0;
    
    return pricing.image * numImages;
  }

  private calculateAudioCost(model: string, characters: number): number {
    const pricing = this.pricing[model as keyof typeof this.pricing] as { audio: number } | undefined;
    if (!pricing) return 0;
    
    return (characters / 1000) * pricing.audio;
  }
}

// 注册Provider
ProviderFactory.register('openai', OpenAiProvider);
