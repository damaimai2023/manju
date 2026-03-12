/**
 * AI成本估算接口
 * POST /api/ai/estimate
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { estimateCost } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { model, type, input } = body;

    if (!model || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: model, type' },
        { status: 400 }
      );
    }

    const cost = await estimateCost(type.toUpperCase(), model, input || {});

    return NextResponse.json(cost);
  } catch (error) {
    console.error('Cost estimation error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取用户AI使用统计
 * GET /api/ai/estimate?userStats=true
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    // 获取使用统计
    const usages = await prisma.apiUsage.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: since },
      },
    });

    // 按Provider统计
    const byProvider = usages.reduce((acc, u) => {
      if (!acc[u.provider]) {
        acc[u.provider] = { cost: 0, requests: 0 };
      }
      acc[u.provider].cost += u.cost;
      acc[u.provider].requests += 1;
      return acc;
    }, {} as Record<string, { cost: number; requests: number }>);

    // 按操作类型统计
    const byOperation = usages.reduce((acc, u) => {
      acc[u.operation] = (acc[u.operation] || 0) + u.cost;
      return acc;
    }, {} as Record<string, number>);

    // 每日趋势
    const dailyTrend = usages.reduce((acc, u) => {
      const date = u.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { cost: 0, requests: 0 };
      }
      acc[date].cost += u.cost;
      acc[date].requests += 1;
      return acc;
    }, {} as Record<string, { cost: number; requests: number }>);

    return NextResponse.json({
      period: `${days} days`,
      totalCost: usages.reduce((sum, u) => sum + u.cost, 0),
      totalRequests: usages.length,
      byProvider,
      byOperation,
      dailyTrend: Object.entries(dailyTrend).map(([date, data]) => ({
        date,
        ...data,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    );
  }
}
