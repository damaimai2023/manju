/**
 * AI任务管理接口
 * GET /api/ai/tasks - 获取任务列表
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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const tasks = await prisma.aiTask.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(projectId && { projectId }),
      },
      include: {
        model: {
          select: { name: true, type: true },
        },
        provider: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.aiTask.count({
      where: {
        userId: session.user.id,
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(projectId && { projectId }),
      },
    });

    const formattedTasks = tasks.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      model: t.model?.name,
      modelType: t.model?.type,
      provider: t.provider?.name,
      prompt: t.prompt.substring(0, 100) + '...',
      resultUrl: t.resultUrl,
      thumbnailUrl: t.thumbnailUrl,
      error: t.error,
      cost: t.cost,
      tokensInput: t.tokensInput,
      tokensOutput: t.tokensOutput,
      generationTime: t.generationTime,
      priority: t.priority,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));

    return NextResponse.json({
      tasks: formattedTasks,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
