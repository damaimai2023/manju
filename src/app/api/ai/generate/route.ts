/**
 * AI生成接口
 * POST /api/ai/generate
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateImage, generateText, selectModel } from '@/lib/ai';
import { z } from 'zod';

const generateRequestSchema = z.object({
  type: z.enum(['image', 'text', 'audio', 'video']),
  prompt: z.string().min(1, '提示词不能为空'),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  
  // 图像生成参数
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  style: z.string().optional(),
  quality: z.enum(['standard', 'hd', 'ultra']).optional(),
  numImages: z.number().min(1).max(4).optional(),
  
  // 文本生成参数
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().optional(),
  
  // 音频/TTS参数
  voiceId: z.string().optional(),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
  pitch: z.number().min(-1).max(1).optional(),
  format: z.enum(['mp3', 'wav', 'ogg', 'pcm']).optional(),
  
  // 项目关联
  projectId: z.string().optional(),
  
  // 任务参数
  parameters: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = generateRequestSchema.parse(body);

    // 检查用户API配额
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    // 估算成本
    let estimatedCost = 0;
    if (validated.model) {
      // 从数据库获取模型价格
      const model = await prisma.aiModel.findFirst({
        where: { modelId: validated.model },
      });
      if (model?.imagePrice) {
        estimatedCost = model.imagePrice * (validated.numImages || 1);
      } else if (model?.inputPrice && model?.outputPrice) {
        estimatedCost = (model.inputPrice + model.outputPrice) / 1000;
      }
    }

    // 创建AI任务记录
    const task = await prisma.aiTask.create({
      data: {
        type: validated.type === 'image' ? 'CHARACTER_GENERATE' : validated.type === 'audio' ? 'AUDIO_TTS' : 'DESCRIPTION_ENHANCE',
        status: 'PROCESSING',
        userId: session.user.id,
        projectId: validated.projectId,
        providerId: await getProviderIdForModel(validated.model),
        modelId: validated.model || (await getDefaultModelId(validated.type)) || '',
        prompt: validated.prompt,
        negativePrompt: validated.negativePrompt,
        parameters: JSON.stringify(validated.parameters || {}),
        priority: 5,
        startedAt: new Date(),
      },
    });

    let result;

    // 根据类型调用不同的生成方法
    switch (validated.type) {
      case 'image': {
        result = await generateImage({
          model: validated.model,
          prompt: validated.prompt,
          negativePrompt: validated.negativePrompt,
          width: validated.width,
          height: validated.height,
          aspectRatio: validated.aspectRatio,
          style: validated.style,
          quality: validated.quality,
          numImages: validated.numImages,
          parameters: validated.parameters,
        });
        break;
      }

      case 'text': {
        result = await generateText({
          model: validated.model,
          prompt: validated.prompt,
          maxTokens: validated.maxTokens,
          temperature: validated.temperature,
          systemPrompt: validated.systemPrompt,
        });
        break;
      }

      case 'audio': {
        const { generateAudio } = await import('@/lib/ai');
        result = await generateAudio({
          model: validated.model,
          prompt: validated.prompt,
          voiceId: validated.voiceId || validated.voice,
          speed: validated.speed,
          pitch: validated.pitch,
          format: validated.format,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unsupported generation type: ${validated.type}` },
          { status: 400 }
        );
    }

    // 更新任务状态
    await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        resultUrl: result.url || result.urls?.[0],
        resultData: result.data ? JSON.stringify(result.data) : null,
        error: result.error,
        errorCode: result.errorCode,
        cost: result.cost,
        tokensInput: (result as any).tokensInput,
        tokensOutput: (result as any).tokensOutput,
        generationTime: result.generationTime,
        completedAt: new Date(),
      },
    });

    // 记录API使用
    await prisma.apiUsage.create({
      data: {
        userId: session.user.id,
        provider: (validated.model?.startsWith('gpt') || validated.model?.startsWith('dall') 
          ? 'OPENAI' 
          : validated.model?.startsWith('cosy') || validated.model?.startsWith('sambert')
          ? 'ALIYUN'
          : 'CUSTOM') as any,
        operation: `${validated.type}-generation`,
        tokensUsed: (result as any).tokensUsed,
        cost: result.cost,
      },
    });

    return NextResponse.json({
      success: result.success,
      taskId: task.id,
      result: result.success
        ? {
            url: result.url,
            urls: (result as any).urls,
            text: (result as any).text,
            cost: result.cost,
            generationTime: result.generationTime,
          }
        : null,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 辅助函数
async function getProviderIdForModel(modelId?: string): Promise<string> {
  if (!modelId) {
    return getDefaultProviderId();
  }

  const model = await prisma.aiModel.findFirst({
    where: { modelId },
    select: { providerId: true },
  });

  return model?.providerId || getDefaultProviderId();
}

async function getDefaultProviderId(): Promise<string> {
  const provider = await prisma.aiProviderConfig.findFirst({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  if (!provider) {
    throw new Error('No active AI provider found');
  }

  return provider.id;
}

async function getDefaultModelId(type: string): Promise<string> {
  const modelType = type.toUpperCase();
  const model = await prisma.aiModel.findFirst({
    where: {
      type: modelType as any,
      isActive: true,
      isDefault: true,
    },
  });

  if (model) return model.modelId;

  // 回退到第一个活跃的模型
  const firstModel = await prisma.aiModel.findFirst({
    where: { type: modelType as any, isActive: true },
  });

  if (!firstModel) {
    throw new Error(`No active model found for type: ${type}`);
  }

  return firstModel.modelId;
}
