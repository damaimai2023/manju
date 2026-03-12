import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateVideoDuration } from "@/lib/video";
import { CreateClipInput, VideoStatus } from "@/types";

// 获取视频片段列表
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

    const clips = await prisma.videoClip.findMany({
      where: { videoId },
      include: {
        shot: {
          select: {
            id: true,
            shotNo: true,
            shotSize: true,
            cameraAngle: true,
            generatedImage: true,
            character: {
              select: { id: true, name: true },
            },
            scene: {
              select: { id: true, name: true },
            },
          },
        },
        storyboard: {
          select: { id: true, name: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(clips);
  } catch (error) {
    console.error("获取片段列表失败:", error);
    return NextResponse.json({ error: "获取片段列表失败" }, { status: 500 });
  }
}

// 创建片段
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
    const body: CreateClipInput = await request.json();

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

    // 计算新片段的位置
    const maxOrder = video.clips.reduce(
      (max, clip) => Math.max(max, clip.order),
      -1
    );
    const lastClip = video.clips.find((c) => c.order === maxOrder);
    const startTime = lastClip
      ? lastClip.startTime + lastClip.duration
      : 0;

    const clip = await prisma.videoClip.create({
      data: {
        name: body.name,
        startTime,
        duration: body.duration || 3000,
        order: maxOrder + 1,
        videoId,
        shotId: body.shotId || null,
        storyboardId: body.storyboardId || null,
        status: "PENDING",
      },
    });

    // 更新视频时长
    await updateVideoDuration(videoId);

    // 更新视频状态为编辑中
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EDITING" as VideoStatus },
    });

    return NextResponse.json(clip, { status: 201 });
  } catch (error) {
    console.error("创建片段失败:", error);
    return NextResponse.json({ error: "创建片段失败" }, { status: 500 });
  }
}
