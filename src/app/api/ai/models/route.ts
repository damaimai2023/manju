/**
 * AI模型列表接口
 * GET /api/ai/models
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const models = await prisma.aiModel.findMany({
      where: {
        isActive: true,
        ...(type && { type: type.toUpperCase() }),
        provider: { isActive: true },
      },
      include: {
        provider: {
          select: { name: true, provider: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    const formattedModels = models.map(m => ({
      id: m.modelId,
      name: m.name,
      provider: m.provider.name,
      providerId: m.providerId,
      type: m.type,
      capabilities: JSON.parse(m.capabilities || '[]'),
      maxTokens: m.maxTokens,
      contextWindow: m.contextWindow,
      pricing: {
        input: m.inputPrice,
        output: m.outputPrice,
        image: m.imagePrice,
      },
      isDefault: m.isDefault,
      config: m.config ? JSON.parse(m.config) : null,
    }));

    return NextResponse.json({
      models: formattedModels,
      count: formattedModels.length,
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
