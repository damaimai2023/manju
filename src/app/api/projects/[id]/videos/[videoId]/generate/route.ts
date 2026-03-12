import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createGenerationTask,
  processClipGeneration,
  getVideoTasks,
  getClipTasks,
  getAIServiceStatus,
} from "@/lib/ai-video";
import { updateVideoStatus } from "@/lib/video";
import { GenerateVideoInput, VideoStatus } from "@/types";

// 获取生成任务列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId } = params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: { email: session.user.email },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const tasks = await getVideoTasks(videoId);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("获取生成任务失败:", error);
    return NextResponse.json({ error: "获取生成任务失败" }, { status: 500 });
  }
}

// 触发生成
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId } = params;
    const body: GenerateVideoInput = await request.json();

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: { email: session.user.email },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, projectId },
    });

    if (!video) {
      return NextResponse.json({ error: "视频不存在" }, { status: 404 });
    }

    // 检查AI服务状态
    const aiStatus = await getAIServiceStatus();
    if (!aiStatus.available) {
      return NextResponse.json(
        { error: aiStatus.message },
        { status: 503 }
      );
    }

    // 更新视频状态为生成中
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "GENERATING" as VideoStatus },
    });

    const tasks: string[] = [];

    // 生成指定片段
    if (body.shotId) {
      const clip = await prisma.videoClip.findFirst({
        where: { shotId: body.shotId, videoId },
        include: { shot: true },
      });

      if (!clip || !clip.shot) {
        return NextResponse.json({ error: "片段不存在" }, { status: 404 });
      }

      const params = {
        prompt: clip.aiPrompt || clip.shot.prompt || "",
        referenceImage: clip.shot.generatedImage || undefined,
        style: body.style || "anime",
        duration: body.duration ? body.duration * 1000 : clip.duration,
      };

      const taskId = await createGenerationTask(
        projectId,
        "GENERATE_CLIP",
        videoId,
        clip.id,
        params
      );

      tasks.push(taskId);

      // 异步处理生成
      processClipGeneration(taskId, clip.id, params).catch(console.error);
    }
    // 生成整个分镜的所有片段
    else if (body.storyboardId) {
      const clips = await prisma.videoClip.findMany({
        where: { storyboardId: body.storyboardId, videoId },
        include: { shot: true },
      });

      for (const clip of clips) {
        if (!clip.shot) continue;

        const params = {
          prompt: clip.aiPrompt || clip.shot.prompt || "",
          referenceImage: clip.shot.generatedImage || undefined,
          style: body.style || "anime",
          duration: body.duration ? body.duration * 1000 : clip.duration,
        };

        const taskId = await createGenerationTask(
          projectId,
          "GENERATE_CLIP",
          videoId,
          clip.id,
          params
        );

        tasks.push(taskId);

        // 异步处理生成
        processClipGeneration(taskId, clip.id, params).catch(console.error);
      }
    }
    // 生成视频的所有待生成片段
    else {
      const clips = await prisma.videoClip.findMany({
        where: {
          videoId,
          status: { in: ["PENDING", "FAILED"] },
        },
        include: { shot: true },
      });

      for (const clip of clips) {
        if (!clip.shot) continue;

        const params = {
          prompt: clip.aiPrompt || clip.shot.prompt || "",
          referenceImage: clip.shot.generatedImage || undefined,
          style: body.style || "anime",
          duration: clip.duration,
        };

        const taskId = await createGenerationTask(
          projectId,
          "GENERATE_CLIP",
          videoId,
          clip.id,
          params
        );

        tasks.push(taskId);

        // 异步处理生成
        processClipGeneration(taskId, clip.id, params).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      tasks,
      message: `已创建 ${tasks.length} 个生成任务`,
    });
  } catch (error) {
    console.error("触发生成失败:", error);
    const message = error instanceof Error ? error.message : "触发生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
