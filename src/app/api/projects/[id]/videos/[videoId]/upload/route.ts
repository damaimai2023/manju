import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVideo } from "@/lib/upload";
import { updateVideoDuration, updateVideoStatus } from "@/lib/video";
import { ClipStatus, VideoStatus } from "@/types";

// 上传视频文件
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

    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clipId = formData.get("clipId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    // 上传文件
    const { url } = await uploadVideo(file);

    // 如果提供了clipId，更新对应的片段
    if (clipId) {
      const clip = await prisma.videoClip.findFirst({
        where: { id: clipId, videoId },
      });

      if (!clip) {
        return NextResponse.json({ error: "片段不存在" }, { status: 404 });
      }

      await prisma.videoClip.update({
        where: { id: clipId },
        data: {
          videoUrl: url,
          status: "UPLOADED" as ClipStatus,
        },
      });
    }

    // 更新视频状态
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EDITING" as VideoStatus },
    });

    return NextResponse.json({
      success: true,
      url,
      clipId,
    });
  } catch (error) {
    console.error("上传视频失败:", error);
    const message = error instanceof Error ? error.message : "上传视频失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 上传视频到片段（旧版本兼容）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id: projectId, videoId } = params;
    const { clipId, videoUrl } = await request.json();

    if (!clipId || !videoUrl) {
      return NextResponse.json(
        { error: "缺少必要参数 clipId 或 videoUrl" },
        { status: 400 }
      );
    }

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
    });

    if (!clip) {
      return NextResponse.json({ error: "片段不存在" }, { status: 404 });
    }

    // 更新片段
    await prisma.videoClip.update({
      where: { id: clipId },
      data: {
        videoUrl,
        status: "UPLOADED" as ClipStatus,
      },
    });

    // 更新视频状态
    await prisma.video.update({
      where: { id: videoId },
      data: { status: "EDITING" as VideoStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新视频URL失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
