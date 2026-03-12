import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateVideoInput } from "@/types";

// 获取视频详情
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

    const video = await prisma.video.findFirst({
      where: { id: videoId, projectId },
      include: {
        clips: {
          orderBy: { order: "asc" },
          include: {
            shot: {
              select: {
                id: true,
                shotNo: true,
                shotSize: true,
                generatedImage: true,
              },
            },
            storyboard: {
              select: { id: true, name: true },
            },
          },
        },
        tracks: {
          include: {
            items: true,
          },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "视频不存在" }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error("获取视频详情失败:", error);
    return NextResponse.json({ error: "获取视频详情失败" }, { status: 500 });
  }
}

// 更新视频
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId } = params;
    const body: UpdateVideoInput = await request.json();

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

    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.resolution && { resolution: body.resolution }),
        ...(body.frameRate && { frameRate: body.frameRate }),
      },
    });

    return NextResponse.json(updatedVideo);
  } catch (error) {
    console.error("更新视频失败:", error);
    return NextResponse.json({ error: "更新视频失败" }, { status: 500 });
  }
}

// 删除视频
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

    await prisma.video.delete({
      where: { id: videoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除视频失败:", error);
    return NextResponse.json({ error: "删除视频失败" }, { status: 500 });
  }
}
