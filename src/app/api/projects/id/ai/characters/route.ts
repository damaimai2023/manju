/**
 * 项目AI角色生成接口
 * POST /api/projects/[id]/ai/characters
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateCharacterWithAI } from '@/lib/ai/utils';
import { z } from 'zod';

const generateCharacterSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  description: z.string().min(1, '角色描述不能为空'),
  age: z.number().optional(),
  gender: z.string().optional(),
  personality: z.string().optional(),
  style: z.string().default('anime style, high quality, detailed'),
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
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validated = generateCharacterSchema.parse(body);

    // 使用AI生成角色
    const result = await generateCharacterWithAI({
      ...validated,
      projectId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      character: {
        id: result.character.id,
        name: result.character.name,
        description: result.character.description,
      },
      prompts: result.prompts,
      tasks: result.tasks.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
      })),
      message: '角色已创建，图像生成任务已提交',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('AI character generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate character', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取项目的AI生成角色列表
 * GET /api/projects/[id]/ai/characters
 */
export async function GET(
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
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // 获取AI生成的角色
    const characters = await prisma.character.findMany({
      where: {
        projectId,
        aiGenerated: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        aiGenerated: true,
        aiPrompt: true,
        frontView: true,
        sideView: true,
        backView: true,
        createdAt: true,
      },
    });

    // 获取关联的生成任务
    const characterIds = characters.map(c => c.id);
    const tasks = await prisma.aiTask.findMany({
      where: {
        projectId,
        type: { in: ['CHARACTER_GENERATE', 'CHARACTER_VIEW'] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        resultUrl: true,
        parameters: true,
      },
    });

    // 将任务关联到角色
    const charactersWithTasks = characters.map(char => {
      const charTasks = tasks.filter(t => {
        try {
          const params = JSON.parse(t.parameters || '{}');
          return params.characterId === char.id;
        } catch {
          return false;
        }
      });

      return {
        ...char,
        generationTasks: charTasks,
      };
    });

    return NextResponse.json({
      characters: charactersWithTasks,
      total: characters.length,
    });
  } catch (error) {
    console.error('Failed to fetch AI characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI characters' },
      { status: 500 }
    );
  }
}
