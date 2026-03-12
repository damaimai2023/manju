/**
 * AI系统初始化API
 * GET /api/admin/init-ai
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 检查是否已有配置
    const existingCount = await prisma.aiProviderConfig.count();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'AI providers already initialized',
        count: existingCount,
      });
    }

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
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AI system initialized successfully',
      providers: providers.length,
    });
  } catch (error) {
    console.error('Failed to initialize AI:', error);
    return NextResponse.json(
      { error: 'Failed to initialize AI', details: (error as Error).message },
      { status: 500 }
    );
  }
}
