/**
 * 阿里云千问 TTS Provider 实现
 * 支持: CosyVoice 长文本语音合成、音色克隆
 */

import { BaseAiProvider, ProviderFactory } from '../base-provider';
import {
  AudioGenerationOptions,
  AudioGenerationResult,
  ModelInfo,
  ProviderConfig,
  AiErrorCode,
} from '../types';

// 克隆任务状态
export type CosyVoiceCloneStatus = 
  | 'RUNNING'      // 任务执行中
  | 'SUSPENDED'    // 任务挂起
  | 'SUCCEEDED'    // 任务成功
  | 'FAILED'       // 任务失败
  | 'UNKNOWN';     // 未知状态

export interface CosyVoiceCloneTask {
  taskId: string;
  status: CosyVoiceCloneStatus;
  result?: {
    voiceId: string;
    url?: string;
  };
  error?: string;
}

export class AliyunTtsProvider extends BaseAiProvider {
  protected readonly defaultBaseUrl = 'https://dashscope.aliyuncs.com/api/v1';

  // 模型定价 (每1000字符)
  private readonly pricing = {
    'cosyvoice-v1': { audio: 0.02 },        // 标准语音合成
    'cosyvoice-clone': { audio: 0.05 },     // 音色克隆 + 合成
    'sambert-zh-cn': { audio: 0.015 },      // 中文标准音色
    'sambert-zh-tw': { audio: 0.015 },      // 台湾口音
  };

  // 预设音色列表
  private readonly stockVoices = [
    { id: 'longxiaochun', name: '龙小春', gender: 'female', language: 'zh', style: '活泼' },
    { id: 'longxiaoxia', name: '龙小夏', gender: 'female', language: 'zh', style: '温柔' },
    { id: 'longxiaocheng', name: '龙小诚', gender: 'male', language: 'zh', style: '稳重' },
    { id: 'longxiaobai', name: '龙小白', gender: 'female', language: 'zh', style: '清纯' },
    { id: 'longxiaowu', name: '龙小武', gender: 'male', language: 'zh', style: '武侠风' },
    { id: 'longshubai', name: '龙叔白', gender: 'male', language: 'zh', style: '成熟' },
  ];

  constructor(config: ProviderConfig) {
    super(config);
  }

  // ==================== 模型信息 ====================

  getModels(): ModelInfo[] {
    return [
      {
        id: 'cosyvoice-v1',
        name: 'CosyVoice 长文本合成',
        provider: 'aliyun',
        type: 'audio',
        capabilities: ['text-to-speech', 'long-text', 'multi-language', 'emotion-control'],
        pricing: this.pricing['cosyvoice-v1'],
      },
      {
        id: 'cosyvoice-clone',
        name: 'CosyVoice 音色克隆',
        provider: 'aliyun',
        type: 'audio',
        capabilities: ['voice-clone', 'text-to-speech', 'few-shot-clone'],
        pricing: this.pricing['cosyvoice-clone'],
      },
      {
        id: 'sambert-zh-cn',
        name: 'Sambert 中文标准',
        provider: 'aliyun',
        type: 'audio',
        capabilities: ['text-to-speech', 'fast', 'preset-voices'],
        pricing: this.pricing['sambert-zh-cn'],
      },
    ];
  }

  supportsModel(model: string): boolean {
    return ['cosyvoice-v1', 'cosyvoice-clone', 'sambert-zh-cn'].includes(model);
  }

  // ==================== 音频生成 ====================

  async generateAudio(options: AudioGenerationOptions): Promise<AudioGenerationResult> {
    const startTime = Date.now();
    
    try {
      const model = options.model || 'cosyvoice-v1';
      
      // 使用用户指定的音色ID或默认音色
      const voiceId = options.voiceId || 'longxiaochun';
      
      // 构建请求体
      const requestBody: any = {
        model: model === 'sambert-zh-cn' ? `sambert-${voiceId}-v1` : 'cosyvoice-v1',
        input: {
          text: options.prompt,
        },
        parameters: {
          format: options.format || 'mp3',
          sample_rate: 24000,
          volume: 50,
          speech_rate: this.mapSpeedToRate(options.speed ?? 1.0),
          pitch_rate: this.mapPitchToRate(options.pitch ?? 0),
        },
      };

      // CosyVoice支持音色克隆后的voice_id
      if (model === 'cosyvoice-v1' && voiceId.startsWith('cosyvoice-')) {
        requestBody.voice_id = voiceId;
      }

      const response = await this.withRetry(async () => {
        const res = await fetch(`${this.config.baseUrl || this.defaultBaseUrl}/services/audio/tts/text2speech`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`TTS request failed: ${res.status} - ${error}`);
        }

        return res.blob();
      });

      // 转换为base64 URL
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = options.format === 'wav' ? 'audio/wav' : 'audio/mp3';
      const url = `data:${mimeType};base64,${base64}`;

      const generationTime = Date.now() - startTime;
      const cost = this.calculateAudioCost(model, options.prompt.length);

      return {
        success: true,
        url,
        cost,
        generationTime,
        format: options.format || 'mp3',
        duration: this.estimateDuration(options.prompt.length),
      };
    } catch (error) {
      return this.createErrorResult(error) as AudioGenerationResult;
    }
  }

  // ==================== 音色克隆 ====================

  /**
   * 创建音色克隆任务
   * @param audioUrl 克隆源音频URL（wav格式，16kHz，单声道）
   * @param text 克隆文本（用于验证）
   * @returns 任务ID
   */
  async createCloneTask(audioUrl: string, text?: string): Promise<{ taskId: string }> {
    const requestBody: any = {
      model: 'cosyvoice-clone',
      input: {
        url: audioUrl,
      },
    };

    if (text) {
      requestBody.input.text = text;
    }

    const response = await this.withRetry(async () => {
      const res = await fetch(`${this.config.baseUrl || this.defaultBaseUrl}/services/audio/tts/voice_cloning`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Clone task creation failed: ${res.status} - ${error}`);
      }

      return res.json();
    });

    // 返回任务ID
    const taskId = response.output?.task_id || response.request_id;
    return { taskId };
  }

  /**
   * 查询克隆任务状态
   */
  async getCloneStatus(taskId: string): Promise<CosyVoiceCloneTask> {
    const response = await this.withRetry(async () => {
      const res = await fetch(`${this.config.baseUrl || this.defaultBaseUrl}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Get clone status failed: ${res.status} - ${error}`);
      }

      return res.json();
    });

    const status = response.output?.task_status || 'UNKNOWN';
    
    return {
      taskId,
      status: status as CosyVoiceCloneStatus,
      result: response.output?.results?.[0] ? {
        voiceId: response.output.results[0].voice_id,
        url: response.output.results[0].url,
      } : undefined,
      error: status === 'FAILED' ? response.output?.error_message : undefined,
    };
  }

  /**
   * 获取预设音色列表
   */
  getStockVoices() {
    return this.stockVoices;
  }

  // ==================== 成本计算 ====================

  estimateCost(model: string, input: any): number {
    if (model.includes('cosyvoice') || model.includes('sambert')) {
      return this.calculateAudioCost(model, input.characters || 1000);
    }
    return 0;
  }

  private calculateAudioCost(model: string, characters: number): number {
    const pricing = this.pricing[model as keyof typeof this.pricing] as { audio: number } | undefined;
    if (!pricing) return 0;
    
    return (characters / 1000) * pricing.audio;
  }

  // ==================== 辅助方法 ====================

  private mapSpeedToRate(speed: number): number {
    // speed: 0.5 ~ 2.0 -> rate: -500 ~ 500
    return Math.round((speed - 1) * 500);
  }

  private mapPitchToRate(pitch: number): number {
    // pitch: -1 ~ 1 -> rate: -500 ~ 500
    return Math.round(pitch * 500);
  }

  private estimateDuration(characters: number): number {
    // 粗略估计: 中文约每秒4个字
    return Math.ceil(characters / 4);
  }

  private createErrorResult(error: any): AudioGenerationResult {
    const errorCode = this.mapErrorCode(error);
    return {
      success: false,
      error: error.message || String(error),
      errorCode,
      cost: 0,
    };
  }

  private mapErrorCode(error: any): string {
    const message = error.message || String(error);
    
    if (message.includes('401') || message.includes('Unauthorized')) {
      return AiErrorCode.AUTHENTICATION_ERROR;
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return AiErrorCode.RATE_LIMITED;
    }
    if (message.includes('413') || message.includes('too large')) {
      return AiErrorCode.CONTENT_TOO_LARGE;
    }
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return AiErrorCode.TIMEOUT;
    }
    
    return AiErrorCode.UNKNOWN_ERROR;
  }
}

// 注册Provider
ProviderFactory.register('aliyun', (config) => new AliyunTtsProvider(config));
