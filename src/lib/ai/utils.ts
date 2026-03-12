/**
 * AI服务工具函数
 */

import { prisma } from '@/lib/prisma';
import { generateImage, generateText } from './router';
import { ImageGenerationOptions, TextGenerationOptions, AiTaskType } from './types';

// ==================== 角色生成 ====================

interface CharacterGenerationParams {
  name: string;
  description: string;
  age?: number;
  gender?: string;
  personality?: string;
  style?: string;
  projectId: string;
  userId: string;
}

/**
 * AI生成角色
 */
export async function generateCharacterWithAI(params: CharacterGenerationParams) {
  const { name, description, age, gender, personality, style, projectId, userId } = params;

  // 1. 优化提示词
  const promptResult = await generateText({
    prompt: `请为角色"${name}"创作详细的图像生成提示词。

角色描述: ${description}
${age ? `年龄: ${age}岁` : ''}
${gender ? `性别: ${gender}` : ''}
${personality ? `性格: ${personality}` : ''}
风格: ${style || 'anime style, high quality'}

请输出:
1. 正面视角提示词 (full body front view)
2. 侧面视角提示词 (side profile view)
3. 背面视角提示词 (back view)
4. 负面提示词

请以JSON格式输出。`,
    model: 'gpt-4o-mini',
  });

  if (!promptResult.success) {
    throw new Error(`Failed to generate prompts: ${promptResult.error}`);
  }

  // 解析提示词
  let prompts: { front: string; side: string; back: string; negative: string };
  try {
    const parsed = JSON.parse(promptResult.text);
    prompts = {
      front: parsed.front || parsed.frontView || '',
      side: parsed.side || parsed.sideView || '',
      back: parsed.back || parsed.backView || '',
      negative: parsed.negative || parsed.negativePrompt || '',
    };
  } catch {
    // 简单解析
    const lines = promptResult.text.split('\n');
    prompts = {
      front: lines.find(l => l.includes('front') || l.includes('正面')) || description,
      side: lines.find(l => l.includes('side') || l.includes('侧面')) || description,
      back: lines.find(l => l.includes('back') || l.includes('背面')) || description,
      negative: 'low quality, blurry, distorted, bad anatomy',
    };
  }

  // 2. 创建角色记录
  const character = await prisma.character.create({
    data: {
      name,
      description,
      age,
      gender,
      personality,
      projectId,
      aiGenerated: true,
      aiPrompt: promptResult.text,
    },
  });

  // 3. 提交图像生成任务
  const views = ['front', 'side', 'back'] as const;
  const generationTasks = [];

  for (const view of views) {
    const viewPrompt = prompts[view];
    const task = await prisma.aiTask.create({
      data: {
        type: view === 'front' ? 'CHARACTER_GENERATE' : 'CHARACTER_VIEW',
        status: 'PENDING',
        userId,
        projectId,
        providerId: await getDefaultProviderId(),
        modelId: await getDefaultModelId('IMAGE'),
        prompt: viewPrompt,
        negativePrompt: prompts.negative,
        parameters: JSON.stringify({
          view,
          characterId: character.id,
          aspectRatio: '3:4',
          quality: 'hd',
        }),
        priority: 5,
      },
    });
    generationTasks.push(task);
  }

  return {
    character,
    prompts,
    tasks: generationTasks,
  };
}

// ==================== 场景生成 ====================

interface SceneGenerationParams {
  name: string;
  description: string;
  timeOfDay?: string;
  atmosphere?: string;
  style?: string;
  projectId: string;
  userId: string;
}

/**
 * AI生成场景
 */
export async function generateSceneWithAI(params: SceneGenerationParams) {
  const { name, description, timeOfDay, atmosphere, style, projectId, userId } = params;

  // 优化提示词
  const promptResult = await generateText({
    prompt: `请为场景"${name}"创作详细的图像生成提示词。

场景描述: ${description}
${timeOfDay ? `时间: ${timeOfDay}` : ''}
${atmosphere ? `氛围: ${atmosphere}` : ''}
风格: ${style || 'anime background style'}

请生成以下视角的提示词:
1. Wide Shot (全景)
2. Full Shot (完整场景)
3. Medium Shot (中景)
4. Close Up (特写)

请以JSON格式输出。`,
    model: 'gpt-4o-mini',
  });

  if (!promptResult.success) {
    throw new Error(`Failed to generate scene prompts: ${promptResult.error}`);
  }

  // 创建场景
  const scene = await prisma.scene.create({
    data: {
      name,
      description,
      timeOfDay,
      atmosphere,
      style,
      projectId,
      aiGenerated: true,
      aiPrompt: promptResult.text,
    },
  });

  return { scene, prompts: promptResult.text };
}

// ==================== 分镜生成 ====================

interface StoryboardGenerationParams {
  storyboardId: string;
  shotId: string;
  description: string;
  shotSize: string;
  cameraAngle: string;
  characterId?: string;
  sceneId?: string;
  style?: string;
  userId: string;
}

/**
 * AI生成分镜图
 */
export async function generateStoryboardShot(params: StoryboardGenerationParams) {
  const {
    storyboardId,
    shotId,
    description,
    shotSize,
    cameraAngle,
    characterId,
    sceneId,
    style,
    userId,
  } = params;

  // 获取角色和场景信息
  const [character, scene] = await Promise.all([
    characterId ? prisma.character.findUnique({ where: { id: characterId } }) : null,
    sceneId ? prisma.scene.findUnique({ where: { id: sceneId } }) : null,
  ]);

  // 构建提示词
  const promptResult = await generateText({
    prompt: `请将以下分镜描述优化为专业的AI图像生成提示词:

画面描述: ${description}
景别: ${shotSize}
机位: ${cameraAngle}
${character ? `角色: ${character.name} - ${character.description}` : ''}
${scene ? `场景: ${scene.name} - ${scene.description}` : ''}
风格: ${style || 'anime cinematic style'}

要求:
1. 翻译成英文提示词
2. 包含构图、光线、色彩描述
3. 适合${shotSize}景别`,
    model: 'gpt-4o-mini',
  });

  if (!promptResult.success) {
    throw new Error(`Failed to enhance shot prompt: ${promptResult.error}`);
  }

  // 提交生成任务
  const task = await prisma.aiTask.create({
    data: {
      type: 'STORYBOARD_SHOT',
      status: 'PENDING',
      userId,
      providerId: await getDefaultProviderId(),
      modelId: await getDefaultModelId('IMAGE'),
      prompt: promptResult.text,
      parameters: JSON.stringify({
        storyboardId,
        shotId,
        characterId,
        sceneId,
        aspectRatio: '16:9',
      }),
      priority: 5,
    },
  });

  return { task, prompt: promptResult.text };
}

// ==================== 剧本生成 ====================

interface ScriptGenerationParams {
  projectId: string;
  title: string;
  genre?: string;
  targetAudience?: string;
  episodeCount?: number;
  characters?: { name: string; description: string }[];
  userId: string;
}

/**
 * AI生成剧本大纲
 */
export async function generateScriptOutline(params: ScriptGenerationParams) {
  const { projectId, title, genre, targetAudience, episodeCount = 1, characters, userId } = params;

  const result = await generateText({
    prompt: `请为漫剧《${title}》创作完整的剧本大纲。

类型: ${genre || '现代都市'}
受众: ${targetAudience || '青少年'}
集数: ${episodeCount}集

${characters ? `角色设定:\n${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}` : ''}

请包含:
1. 故事主题与核心冲突
2. 世界观设定
3. 角色关系图
4. 分集大纲 (每集300-500字)
5. 关键分镜场景描述

请以结构化JSON格式输出。`,
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 8000,
    temperature: 0.8,
  });

  return result;
}

// ==================== 提示词优化 ====================

/**
 * 优化图像生成提示词
 */
export async function enhanceImagePrompt(
  originalPrompt: string,
  type: 'character' | 'scene' | 'prop' | 'shot'
) {
  const typeGuidance: Record<string, string> = {
    character: '优化为角色设计提示词，包含外貌、服装、表情、姿态细节',
    scene: '优化为背景场景提示词，包含环境、光线、氛围、构图',
    prop: '优化为道具设计提示词，包含材质、细节、光影',
    shot: '优化为分镜画面提示词，包含景别、机位、动作',
  };

  const result = await generateText({
    prompt: `请将以下描述优化为专业的AI图像生成提示词:

原始描述: ${originalPrompt}
类型: ${type}

${typeGuidance[type]}

请输出:
1. 优化后的英文提示词 (用于DALL-E/SD生成)
2. 负面提示词
3. 推荐参数`,
    model: 'gpt-4o-mini',
  });

  return result;
}

// ==================== 辅助函数 ====================

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
  const model = await prisma.aiModel.findFirst({
    where: {
      type,
      isActive: true,
      isDefault: true,
    },
  });
  
  if (!model) {
    // 如果没有默认模型，返回第一个活跃的
    const firstModel = await prisma.aiModel.findFirst({
      where: { type, isActive: true },
    });
    if (!firstModel) {
      throw new Error(`No active model found for type: ${type}`);
    }
    return firstModel.modelId;
  }
  
  return model.modelId;
}

// ==================== 成本计算 ====================

/**
 * 计算项目AI使用成本
 */
export async function calculateProjectAiCost(projectId: string): Promise<{
  totalCost: number;
  taskCount: number;
  byType: Record<string, number>;
}> {
  const tasks = await prisma.aiTask.findMany({
    where: { projectId },
    select: { type: true, cost: true },
  });

  const totalCost = tasks.reduce((sum, t) => sum + t.cost, 0);
  
  const byType: Record<string, number> = {};
  for (const task of tasks) {
    byType[task.type] = (byType[task.type] || 0) + task.cost;
  }

  return {
    totalCost,
    taskCount: tasks.length,
    byType,
  };
}

/**
 * 获取用户AI使用统计
 */
export async function getUserAiStats(userId: string, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const usages = await prisma.apiUsage.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
  });

  return {
    totalCost: usages.reduce((sum, u) => sum + u.cost, 0),
    totalRequests: usages.length,
    byProvider: usages.reduce((acc, u) => {
      acc[u.provider] = (acc[u.provider] || 0) + u.cost;
      return acc;
    }, {} as Record<string, number>),
  };
}
