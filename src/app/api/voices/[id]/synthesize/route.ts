/**
 * 语音合成 API
 * POST - 使用指定音色进行语音合成
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AliyunTtsProvider } from "@/lib/ai/providers/aliyun-tts-provider";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, speed = 1.0, pitch = 0, format = "mp3" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // 验证音色
    const voice = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!voice) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    // 克隆音色需要等待克隆完成
    if (voice.type === "CLONED" && voice.cloneStatus !== "SUCCESS") {
      return NextResponse.json(
        { error: "Voice clone not ready" },
        { status: 400 }
      );
    }

    // 获取阿里云Provider配置
    const providerConfig = await prisma.aiProviderConfig.findFirst({
      where: {
        provider: "aliyun",
        isActive: true,
      },
    });

    if (!providerConfig?.apiKey) {
      return NextResponse.json(
        { error: "Aliyun TTS provider not configured" },
        { status: 400 }
      );
    }

    // 创建Provider实例
    const { ProviderFactory } = await import("@/lib/ai/base-provider");
    const provider = ProviderFactory.create({
      name: "aliyun-tts",
      provider: "aliyun",
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl || undefined,
    });

    if (!(provider instanceof AliyunTtsProvider)) {
      return NextResponse.json(
        { error: "Invalid provider type" },
        { status: 500 }
      );
    }

    // 确定使用的模型和音色ID
    const model = voice.type === "CLONED" ? "cosyvoice-clone" : "cosyvoice-v1";
    const voiceId = voice.providerVoiceId || "longxiaochun";

    // 执行语音合成
    const result = await provider.generateAudio({
      model,
      prompt: text,
      voiceId,
      speed,
      pitch,
      format: format as "mp3" | "wav" | "ogg" | "pcm",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Synthesis failed" },
        { status: 500 }
      );
    }

    // 记录AI任务
    const aiModel = await prisma.aiModel.findFirst({
      where: { modelId: model },
    });

    if (aiModel) {
      await prisma.aiTask.create({
        data: {
          type: "VOICE_TTS",
          status: "COMPLETED",
          userId: session.user.id,
          providerId: providerConfig.id,
          modelId: aiModel.id,
          prompt: text,
          resultUrl: result.url,
          cost: result.cost,
          generationTime: result.generationTime,
        },
      });
    }

    return NextResponse.json({
      url: result.url,
      format: result.format,
      duration: result.duration,
      cost: result.cost,
    });
  } catch (error) {
    console.error("[Voice Synthesize API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
