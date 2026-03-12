import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  exportVideo,
  validateExportConfig,
  getExportProgress,
  cancelExport,
  getDefaultExportConfig,
  estimateFileSize,
} from "@/lib/video-export";
import { canExportVideo, updateVideoStatus } from "@/lib/video";
import { VideoStatus } from "@/types";

// 获取导出进度
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

    const progress = await getExportProgress(taskId);

    return NextResponse.json(progress);
  } catch (error) {
    console.error("获取导出进度失败:", error);
    const message = error instanceof Error ? error.message : "获取导出进度失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 触发导出
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
    const config = await request.json();

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
      include: { clips: true },
    });

    if (!video) {
      return NextResponse.json({ error: "视频不存在" }, { status: 404 });
    }

    // 检查是否可以导出
    if (!canExportVideo(video.clips)) {
      return NextResponse.json(
        { error: "还有片段未完成生成，无法导出" },
        { status: 400 }
      );
    }

    // 验证导出配置
    const finalConfig = { ...getDefaultExportConfig(), ...config };
    if (!validateExportConfig(finalConfig)) {
      return NextResponse.json(
        { error: "无效的导出配置" },
        { status: 400 }
      );
    }

    // 触发导出
    const taskId = await exportVideo(videoId, finalConfig);

    return NextResponse.json({
      success: true,
      taskId,
      estimatedSize: estimateFileSize(video.duration, finalConfig),
      message: "导出任务已创建",
    });
  } catch (error) {
    console.error("触发导出失败:", error);
    const message = error instanceof Error ? error.message : "触发导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 取消导出
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

    const cancelled = await cancelExport(taskId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "无法取消导出，任务可能已完成或失败" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "导出已取消" });
  } catch (error) {
    console.error("取消导出失败:", error);
    const message = error instanceof Error ? error.message : "取消导出失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
