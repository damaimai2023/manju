/**
 * 音色管理 API
 * GET - 获取音色列表
 * POST - 创建音色
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取音色列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");

    const where: any = {
      userId: session.user.id,
      isActive: true,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (type) {
      where.type = type;
    }

    const voices = await prisma.voice.findMany({
      where,
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        _count: {
          select: { characters: true },
        },
      },
    });

    return NextResponse.json({ voices });
  } catch (error) {
    console.error("[Voices API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 500 }
    );
  }
}

// 创建音色
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type = "STOCK",
      provider = "aliyun",
      providerVoiceId,
      projectId,
      language = "zh",
      gender,
      ageGroup,
      style,
      tags,
      previewUrl,
      previewText,
    } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // 验证项目权限
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    const voice = await prisma.voice.create({
      data: {
        name,
        description,
        type,
        provider,
        providerVoiceId,
        projectId,
        userId: session.user.id,
        language,
        gender,
        ageGroup,
        style,
        tags: tags ? JSON.stringify(tags) : null,
        previewUrl,
        previewText,
      },
    });

    return NextResponse.json({ voice }, { status: 201 });
  } catch (error) {
    console.error("[Voices API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create voice" },
      { status: 500 }
    );
  }
}
