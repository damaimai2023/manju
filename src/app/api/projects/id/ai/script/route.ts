/**
 * 项目AI剧本生成接口
 * POST /api/projects/[id]/ai/script
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateScriptOutline, generateText } from '@/lib/ai';
import { z } from 'zod';

const generateScriptSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  genre: z.enum(['romance', 'action', 'comedy', 'drama', 'fantasy', 'scifi', 'horror', 'mystery']).optional(),
  targetAudience: z.enum(['children', 'teen', 'young_adult', 'adult', 'all']).optional(),
  episodeCount: z.number().min(1).max(50).default(1),
  duration: z.enum(['short', 'medium', 'long']).default('medium'),
  tone: z.string().optional(),
  themes: z.array(z.string()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // 验证项目权限
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        characters: true,
        scenes: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = generateScriptSchema.parse(body);

    // 记录AI任务
    const task = await prisma.aiTask.create({
      data: {
        type: 'SCRIPT_GENERATE',
        status: 'PROCESSING',
        userId: session.user.id,
        projectId,
        providerId: await getDefaultProviderId(),
        modelId: 'claude-3-7-sonnet-20250219',
        prompt: `Generate script for ${validated.title}`,
        parameters: JSON.stringify(validated),
        priority: 6,
        startedAt: new Date(),
      },
    });

    // 生成剧本
    const result = await generateScriptOutline({
      projectId,
      title: validated.title,
      genre: validated.genre,
      targetAudience: validated.targetAudience,
      episodeCount: validated.episodeCount,
      characters: project.characters.map(c => ({
        name: c.name,
        description: c.description || '',
      })),
      userId: session.user.id,
    });

    // 更新任务状态
    await prisma.aiTask.update({
      where: { id: task.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        resultData: result.text,
        error: result.error,
        cost: result.cost,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        generationTime: result.generationTime,
        completedAt: new Date(),
      },
    });

    // 记录API使用
    await prisma.apiUsage.create({
      data: {
        userId: session.user.id,
        provider: 'ANTHROPIC',
        operation: 'script-generation',
        tokensUsed: result.tokensUsed,
        cost: result.cost,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // 尝试解析JSON结果
    let parsedScript = null;
    try {
      // 提取JSON部分
      const jsonMatch = result.text.match(/```json\n([\s\S]*?)\n```/) || 
                        result.text.match(/{[\s\S]*}/);
      if (jsonMatch) {
        parsedScript = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch {
      // 解析失败，返回原始文本
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      script: parsedScript || { raw: result.text },
      cost: result.cost,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('AI script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate script', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 生成单集详细剧本
 * POST /api/projects/[id]/ai/script/episode
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await req.json();
    const { episodeNumber, outline, characters, scenes } = body;

    const result = await generateText({
      model: 'claude-3-7-sonnet-20250219',
      prompt: `请根据以下大纲创作第${episodeNumber}集的详细分镜剧本:

故事大纲: ${outline}

角色:
${characters?.map((c: any) => `- ${c.name}: ${c.description}`).join('\n')}

场景:
${scenes?.map((s: any) => `- ${s.name}: ${s.description}`).join('\n')}

请包含:
1. 场景切换标记
2. 每个镜头的详细描述 (景别、机位、动作)
3. 对白和旁白
4. 音效和音乐提示

请以专业剧本格式输出。`,
      maxTokens: 8000,
      temperature: 0.8,
    });

    return NextResponse.json({
      success: result.success,
      episodeScript: result.text,
      cost: result.cost,
    });
  } catch (error) {
    console.error('Episode script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate episode script' },
      { status: 500 }
    );
  }
}

// 辅助函数
async function getDefaultProviderId(): Promise<string> {
  const provider = await prisma.aiProviderConfig.findFirst({
    where: { isActive: true, provider: 'anthropic' },
  });
  if (!provider) {
    const anyProvider = await prisma.aiProviderConfig.findFirst({
      where: { isActive: true },
    });
    if (!anyProvider) throw new Error('No active AI provider');
    return anyProvider.id;
  }
  return provider.id;
}
