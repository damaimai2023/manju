import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClipsFromStoryboard, createDefaultTracks } from "@/lib/video";
import { CreateVideoInput, VideoStatus } from "@/types";

// 获取项目视频列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId } = params;

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

    const videos = await prisma.video.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { clips: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("获取视频列表失败:", error);
    return NextResponse.json({ error: "获取视频列表失败" }, { status: 500 });
  }
}

// 创建视频
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId } = params;
    const body: CreateVideoInput = await request.json();

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

    // 创建视频
    const video = await prisma.video.create({
      data: {
        name: body.name,
        description: body.description || null,
        status: "DRAFT" as VideoStatus,
        projectId,
      },
    });

    // 如果从分镜导入，创建片段
    if (body.storyboardId) {
      const storyboard = await prisma.storyboard.findFirst({
        where: {
          id: body.storyboardId,
          projectId,
        },
      });

      if (storyboard) {
        await createClipsFromStoryboard(video.id, body.storyboardId);
        await createDefaultTracks(video.id);

        // 更新视频状态为编辑中
        await prisma.video.update({
          where: { id: video.id },
          data: { status: "EDITING" as VideoStatus },
        });
      }
    }

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("创建视频失败:", error);
    return NextResponse.json({ error: "创建视频失败" }, { status: 500 });
  }
}
