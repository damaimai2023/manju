/**
 * AI系统初始化脚本
 * 运行: npx tsx src/scripts/init-ai.ts
 */

import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🚀 初始化AI系统...\n');

  // 检查是否已有配置
  const existingCount = await prisma.aiProviderConfig.count();
  if (existingCount > 0) {
    console.log('✅ AI providers already initialized');
    console.log(`   Found ${existingCount} providers\n`);
    return;
  }

  console.log('📦 创建默认AI Provider配置...\n');

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
    {
      name: '阿里云百炼',
      provider: 'aliyun',
      rateLimit: 60,
      priority: 7,
    },
  ];

  for (const p of providers) {
    const created = await prisma.aiProviderConfig.create({
      data: p,
    });
    console.log(`  ✓ Created provider: ${p.name}`);

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
      console.log(`    - Added 4 models`);
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
      console.log(`    - Added 2 models`);
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
      console.log(`    - Added 2 models`);
    } else if (p.provider === 'aliyun') {
      await prisma.aiModel.createMany({
        data: [
          {
            providerId: created.id,
            modelId: 'cosyvoice-v1',
            name: 'CosyVoice 长文本合成',
            type: 'AUDIO',
            capabilities: JSON.stringify(['text-to-speech', 'long-text', 'emotion-control']),
            outputPrice: 0.02,
            isDefault: true,
          },
          {
            providerId: created.id,
            modelId: 'cosyvoice-clone',
            name: 'CosyVoice 音色克隆',
            type: 'AUDIO',
            capabilities: JSON.stringify(['voice-clone', 'text-to-speech']),
            outputPrice: 0.05,
          },
          {
            providerId: created.id,
            modelId: 'sambert-zh-cn',
            name: 'Sambert 中文标准',
            type: 'AUDIO',
            capabilities: JSON.stringify(['text-to-speech', 'fast', 'preset-voices']),
            outputPrice: 0.015,
          },
        ],
      });
      console.log(`    - Added 3 models`);
    }
  }

  console.log('\n✅ AI系统初始化完成!');
  console.log('\n下一步:');
  console.log('  1. 在.env文件中配置AI API密钥:');
  console.log('     - OPENAI_API_KEY');
  console.log('     - STABILITY_API_KEY');
  console.log('     - ANTHROPIC_API_KEY');
  console.log('     - ALIYUN_API_KEY (阿里云百炼)');
  console.log('  2. 在管理后台配置各Provider的API密钥');
  console.log('  3. 开始使用AI功能!\n');
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
