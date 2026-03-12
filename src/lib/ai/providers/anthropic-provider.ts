/**
 * Anthropic Provider 实现
 * 支持: Claude 3.7 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAiProvider, ProviderFactory } from '../base-provider';
import {
  TextGenerationOptions,
  TextGenerationResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  ModelInfo,
  ProviderConfig,
  AiErrorCode,
} from '../types';

export class AnthropicProvider extends BaseAiProvider {
  protected readonly defaultBaseUrl = 'https://api.anthropic.com/v1';
  private client: Anthropic;

  // 模型定价 (每百万token)
  private readonly pricing: Record<string, { input: number; output: number }> = {
    'claude-3-7-sonnet-20250219': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  };

  // 模型显示名称映射
  private readonly modelNames: Record<string, string> = {
    'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    'claude-3-haiku-20240307': 'Claude 3 Haiku',
  };

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || this.defaultBaseUrl,
      timeout: config.timeout,
      maxRetries: 0,
    });
  }

  // ==================== 模型信息 ====================

  getModels(): ModelInfo[] {
    return [
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        provider: 'anthropic',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'function-calling', 'extended-thinking', 'code-generation'],
        maxTokens: 8192,
        contextWindow: 200000,
        pricing: this.pricing['claude-3-7-sonnet-20250219'],
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'function-calling', 'code-generation'],
        maxTokens: 8192,
        contextWindow: 200000,
        pricing: this.pricing['claude-3-5-sonnet-20241022'],
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'fast-response'],
        maxTokens: 4096,
        contextWindow: 200000,
        pricing: this.pricing['claude-3-5-haiku-20241022'],
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'complex-reasoning', 'creative-writing'],
        maxTokens: 4096,
        contextWindow: 200000,
        pricing: this.pricing['claude-3-opus-20240229'],
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        type: 'multimodal',
        capabilities: ['text-generation', 'vision', 'cost-effective', 'fast-response'],
        maxTokens: 4096,
        contextWindow: 200000,
        pricing: this.pricing['claude-3-haiku-20240307'],
      },
    ];
  }

  supportsModel(model: string): boolean {
    return Object.keys(this.pricing).includes(model);
  }

  // ==================== 文本生成 ====================

  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model || 'claude-3-5-haiku-20241022';
      
      // 构建消息
      const messages: Anthropic.MessageParam[] = [];
      
      // 处理多模态输入
      if (options.images && options.images.length > 0) {
        const content: Anthropic.ContentBlockParam[] = [
          { type: 'text', text: options.prompt },
          ...options.images.map(url => ({
            type: 'image' as const,
            source: {
              type: 'url' as const,
              url,
            },
          })),
        ];
        messages.push({ role: 'user', content });
      } else {
        messages.push({ role: 'user', content: options.prompt });
      }

      const response = await this.withRetry(async () => {
        return this.client.messages.create({
          model,
          messages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature,
          top_p: options.topP,
          top_k: options.topK,
          stop_sequences: options.stopSequences,
          system: options.systemPrompt,
        });
      });

      const generationTime = Date.now() - startTime;
      const usage = response.usage;
      const cost = this.calculateCost(
        model, 
        usage?.input_tokens || 0, 
        usage?.output_tokens || 0
      );

      // 提取文本内容
      const textBlocks = response.content.filter(c => c.type === 'text');
      const text = textBlocks.map(c => (c as any).text).join('');

      return {
        success: true,
        text,
        cost,
        generationTime,
        tokensInput: usage?.input_tokens,
        tokensOutput: usage?.output_tokens,
        tokensUsed: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
        finishReason: response.stop_reason || undefined,
        usage: usage ? {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.createErrorResult(error) as TextGenerationResult;
    }
  }

  // ==================== 图像生成 (Claude不直接支持，返回不支持) ====================

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return {
      success: false,
      error: 'Anthropic Claude does not support image generation. Please use OpenAI DALL-E or Stability AI instead.',
      errorCode: 'UNSUPPORTED_OPERATION',
      cost: 0,
    };
  }

  // ==================== 剧本生成辅助方法 ====================

  /**
   * 生成分镜剧本
   */
  async generateStoryboardScript(
    storyTitle: string,
    characters: { name: string; description: string }[],
    scenes: { name: string; description: string }[],
    style: string,
    episodeCount: number = 1
  ): Promise<TextGenerationResult> {
    const prompt = `请为漫剧《${storyTitle}》创作详细的剧本大纲和分镜脚本。

角色设定:
${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

场景设定:
${scenes.map(s => `- ${s.name}: ${s.description}`).join('\n')}

风格: ${style}

请包含以下内容:
1. 故事大纲 (约500字)
2. 分集剧情 (共${episodeCount}集)
3. 详细分镜脚本，包含:
   - 镜头编号
   - 景别 (远景/中景/近景等)
   - 画面描述
   - 对白/旁白
   - 镜头运动

请以JSON格式输出，便于后续处理。`;

    return this.generateText({
      model: 'claude-3-7-sonnet-20250219',
      prompt,
      systemPrompt: '你是一个专业的漫剧编剧，擅长创作视觉化强、节奏明快的剧本。请确保分镜描述具体、可执行，适合AI图像生成。',
      maxTokens: 8000,
      temperature: 0.8,
    });
  }

  /**
   * 优化提示词
   */
  async enhancePrompt(
    originalPrompt: string,
    type: 'character' | 'scene' | 'shot',
    style?: string
  ): Promise<TextGenerationResult> {
    const typeInstructions: Record<string, string> = {
      character: '优化角色描述，使其更适合AI图像生成，包含外貌、服装、姿态、表情等细节。',
      scene: '优化场景描述，包含环境、光线、氛围、构图建议。',
      shot: '优化分镜描述，使其成为专业的AI图像生成提示词。',
    };

    const prompt = `请将以下描述优化为专业的AI图像生成提示词:

原始描述: ${originalPrompt}
类型: ${type}
${style ? `风格: ${style}` : ''}

${typeInstructions[type]}

请输出:
1. 优化后的英文提示词 (用于AI生成)
2. 优化后的中文提示词 (用于展示)
3. 负面提示词 (需要避免的元素)
4. 推荐参数 (分辨率、风格等)`;

    return this.generateText({
      model: 'claude-3-5-haiku-20241022',
      prompt,
      maxTokens: 2000,
    });
  }

  /**
   * 生成角色对话
   */
  async generateDialogue(
    characters: { name: string; personality: string }[],
    scene: string,
    context: string,
    emotion: string
  ): Promise<TextGenerationResult> {
    const prompt = `请为以下场景创作角色对话:

场景: ${scene}
情境: ${context}
情感基调: ${emotion}

角色:
${characters.map(c => `- ${c.name}: ${c.personality}`).join('\n')}

要求:
- 对话自然流畅，符合角色性格
- 包含动作和表情描述
- 适合漫剧配音使用
- 中文输出`;

    return this.generateText({
      model: 'claude-3-5-sonnet-20241022',
      prompt,
      maxTokens: 2000,
      temperature: 0.9,
    });
  }

  // ==================== 成本计算 ====================

  estimateCost(model: string, input: any): number {
    if (model.startsWith('claude')) {
      return this.calculateCost(
        model,
        input.tokensInput || this.estimateTokens(input.prompt || ''),
        input.tokensOutput || Math.ceil((input.maxTokens || 1000) * 0.7)
      );
    }
    return 0;
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.pricing[model];
    if (!pricing) return 0;
    
    // 转换为每1000token的价格
    return (inputTokens / 1000 * (pricing.input / 100)) + 
           (outputTokens / 1000 * (pricing.output / 100));
  }
}

// 注册Provider
ProviderFactory.register('anthropic', AnthropicProvider);
