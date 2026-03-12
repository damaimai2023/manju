import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateVideoDuration, reorderClips } from "@/lib/video";
import { UpdateClipInput } from "@/types";

// 获取片段详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string; clipId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId, clipId } = params;

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

    const clip = await prisma.videoClip.findFirst({
      where: { id: clipId, videoId },
      include: {
        shot: {
          select: {
            id: true,
            shotNo: true,
            shotSize: true,
            cameraAngle: true,
            generatedImage: true,
            prompt: true,
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
        generationTasks: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!clip) {
      return NextResponse.json({ error: "片段不存在" }, { status: 404 });
    }

    return NextResponse.json(clip);
  } catch (error) {
    console.error("获取片段详情失败:", error);
    return NextResponse.json({ error: "获取片段详情失败" }, { status: 500 });
  }
}

// 更新片段
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string; clipId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId, clipId } = params;
    const body: UpdateClipInput & { reorder?: { id: string; order: number; startTime: number }[] } = await request.json();

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

    const clip = await prisma.videoClip.findFirst({
      where: { id: clipId, videoId },
    });

    if (!clip) {
      return NextResponse.json({ error: "片段不存在" }, { status: 404 });
    }

    // 处理批量重新排序
    if (body.reorder && body.reorder.length > 0) {
      await reorderClips(videoId, body.reorder);
      await updateVideoDuration(videoId);
      return NextResponse.json({ success: true });
    }

    // 更新片段
    const updatedClip = await prisma.videoClip.update({
      where: { id: clipId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.startTime !== undefined && { startTime: body.startTime }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    // 更新视频时长
    await updateVideoDuration(videoId);

    return NextResponse.json(updatedClip);
  } catch (error) {
    console.error("更新片段失败:", error);
    return NextResponse.json({ error: "更新片段失败" }, { status: 500 });
  }
}

// 删除片段
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string; clipId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId, clipId } = params;

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

    const clip = await prisma.videoClip.findFirst({
      where: { id: clipId, videoId },
    });

    if (!clip) {
      return NextResponse.json({ error: "片段不存在" }, { status: 404 });
    }

    await prisma.videoClip.delete({
      where: { id: clipId },
    });

    // 更新视频时长
    await updateVideoDuration(videoId);

    // 重新排序剩余片段
    const remainingClips = await prisma.videoClip.findMany({
      where: { videoId },
      orderBy: { order: "asc" },
    });

    let currentTime = 0;
    for (let i = 0; i < remainingClips.length; i++) {
      await prisma.videoClip.update({
        where: { id: remainingClips[i].id },
        data: {
          order: i,
          startTime: currentTime,
        },
      });
      currentTime += remainingClips[i].duration;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除片段失败:", error);
    return NextResponse.json({ error: "删除片段失败" }, { status: 500 });
  }
}
