/**
 * 音色克隆 API
 * POST - 启动音色克隆任务
 * GET - 查询克隆任务状态
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AliyunTtsProvider } from "@/lib/ai/providers/aliyun-tts-provider";

// 启动音色克隆任务
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
    const { audioUrl, text } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: "Audio URL is required" },
        { status: 400 }
      );
    }

    // 验证音色所有权
    const voice = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        type: "CLONED",
      },
    });

    if (!voice) {
      return NextResponse.json(
        { error: "Voice not found or not a cloneable voice" },
        { status: 404 }
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

    // 启动克隆任务
    const { taskId } = await provider.createCloneTask(audioUrl, text);

    // 更新音色状态
    await prisma.voice.update({
      where: { id: params.id },
      data: {
        cloneStatus: "PENDING",
        cloneTaskId: taskId,
        cloneAudioUrl: audioUrl,
        cloneText: text,
      },
    });

    // 创建AI任务记录
    await prisma.aiTask.create({
      data: {
        type: "VOICE_CLONE" as const,
        status: "PENDING",
        userId: session.user.id,
        providerId: providerConfig.id,
        modelId: (await prisma.aiModel.findFirst({
          where: { modelId: "cosyvoice-clone" },
        }))?.id || "",
        prompt: `Clone voice: ${voice.name}`,
        parameters: JSON.stringify({ audioUrl, text }),
      },
    });

    return NextResponse.json({ taskId });
  } catch (error) {
    console.error("[Voice Clone API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to start clone task" },
      { status: 500 }
    );
  }
}

// 查询克隆任务状态
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证音色所有权
    const voice = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!voice || !voice.cloneTaskId) {
      return NextResponse.json(
        { error: "Voice not found or no clone task" },
        { status: 404 }
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

    // 查询任务状态
    const taskStatus = await provider.getCloneStatus(voice.cloneTaskId);

    // 更新本地状态
    let newStatus: "NONE" | "PENDING" | "SUCCESS" | "FAILED" = "PENDING";
    if (taskStatus.status === "SUCCEEDED") {
      newStatus = "SUCCESS";
    } else if (taskStatus.status === "FAILED") {
      newStatus = "FAILED";
    }

    // 如果状态变化，更新数据库
    if (newStatus !== voice.cloneStatus) {
      await prisma.voice.update({
        where: { id: params.id },
        data: {
          cloneStatus: newStatus,
          providerVoiceId: taskStatus.result?.voiceId || voice.providerVoiceId,
        },
      });
    }

    return NextResponse.json({
      taskId: voice.cloneTaskId,
      status: taskStatus.status,
      cloneStatus: newStatus,
      voiceId: taskStatus.result?.voiceId,
      error: taskStatus.error,
    });
  } catch (error) {
    console.error("[Voice Clone API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get clone status" },
      { status: 500 }
    );
  }
}
