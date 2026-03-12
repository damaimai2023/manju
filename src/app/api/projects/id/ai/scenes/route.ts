/**
 * 项目AI场景生成接口
 * POST /api/projects/[id]/ai/scenes
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSceneWithAI, generateImage } from '@/lib/ai';
import { z } from 'zod';

const generateSceneSchema = z.object({
  name: z.string().min(1, '场景名称不能为空'),
  description: z.string().min(1, '场景描述不能为空'),
  timeOfDay: z.enum(['morning', 'noon', 'afternoon', 'evening', 'night', 'dawn', 'dusk']).optional(),
  atmosphere: z.string().optional(),
  style: z.string().default('anime background style, detailed environment'),
  generateImages: z.boolean().default(false),
  views: z.array(z.enum(['wide', 'full', 'medium', 'close'])).default(['wide']),
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
    const validated = generateSceneSchema.parse(body);

    // 1. 创建场景记录
    const scene = await prisma.scene.create({
      data: {
        name: validated.name,
        description: validated.description,
        timeOfDay: validated.timeOfDay,
        atmosphere: validated.atmosphere,
        style: validated.style,
        projectId,
        aiGenerated: true,
      },
    });

    // 2. 生成场景提示词
    const promptResult = await generateSceneWithAI({
      name: validated.name,
      description: validated.description,
      timeOfDay: validated.timeOfDay,
      atmosphere: validated.atmosphere,
      style: validated.style,
      projectId,
      userId: session.user.id,
    });

    // 3. 如果需要，生成图像
    let generationTasks = [];
    if (validated.generateImages) {
      const viewPrompts: Record<string, string> = {
        wide: `Wide shot of ${validated.name}, ${validated.description}, establishing shot, ${validated.timeOfDay || ''} lighting, ${validated.style}`,
        full: `Full scene view of ${validated.name}, ${validated.description}, detailed environment, ${validated.style}`,
        medium: `Medium shot scene of ${validated.name}, ${validated.description}, ${validated.style}`,
        close: `Close up details of ${validated.name}, ${validated.description}, ${validated.style}`,
      };

      for (const view of validated.views) {
        const task = await prisma.aiTask.create({
          data: {
            type: 'SCENE_GENERATE',
            status: 'PENDING',
            userId: session.user.id,
            projectId,
            providerId: await getDefaultProviderId(),
            modelId: await getDefaultModelId('IMAGE'),
            prompt: viewPrompts[view],
            parameters: JSON.stringify({
              view,
              sceneId: scene.id,
              aspectRatio: view === 'wide' ? '16:9' : '1:1',
            }),
            priority: 4,
          },
        });
        generationTasks.push(task);
      }
    }

    return NextResponse.json({
      success: true,
      scene: {
        id: scene.id,
        name: scene.name,
        description: scene.description,
      },
      prompts: promptResult.prompts,
      tasks: generationTasks.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
      })),
      message: validated.generateImages 
        ? '场景已创建，图像生成任务已提交'
        : '场景已创建',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('AI scene generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scene', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * 获取项目的AI生成场景列表
 * GET /api/projects/[id]/ai/scenes
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

    const scenes = await prisma.scene.findMany({
      where: {
        projectId,
        aiGenerated: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        timeOfDay: true,
        atmosphere: true,
        style: true,
        aiGenerated: true,
        aiPrompt: true,
        wideShot: true,
        fullShot: true,
        mediumShot: true,
        closeUp: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      scenes,
      total: scenes.length,
    });
  } catch (error) {
    console.error('Failed to fetch AI scenes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI scenes' },
      { status: 500 }
    );
  }
}

// 辅助函数
async function getDefaultProviderId(): Promise<string> {
  const provider = await prisma.aiProviderConfig.findFirst({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });
  if (!provider) throw new Error('No active AI provider');
  return provider.id;
}

async function getDefaultModelId(type: string): Promise<string> {
  const model = await prisma.aiModel.findFirst({
    where: { type: type.toUpperCase() as any, isActive: true, isDefault: true },
  });
  if (model) return model.modelId;
  
  const firstModel = await prisma.aiModel.findFirst({
    where: { type: type.toUpperCase() as any, isActive: true },
  });
  if (!firstModel) throw new Error(`No model for type: ${type}`);
  return firstModel.modelId;
}
