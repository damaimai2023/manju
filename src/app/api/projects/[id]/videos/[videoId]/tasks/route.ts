import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelTask } from "@/lib/ai-video";

// 获取视频的所有任务
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

    const tasks = await prisma.videoGenerationTask.findMany({
      where: { videoId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("获取任务列表失败:", error);
    return NextResponse.json({ error: "获取任务列表失败" }, { status: 500 });
  }
}

// 取消任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId } = params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

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

    if (!taskId) {
      return NextResponse.json({ error: "缺少任务ID" }, { status: 400 });
    }

    const cancelled = await cancelTask(taskId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "无法取消任务，任务可能正在处理或已完成" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "任务已取消" });
  } catch (error) {
    console.error("取消任务失败:", error);
    return NextResponse.json({ error: "取消任务失败" }, { status: 500 });
  }
}
