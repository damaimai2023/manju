/**
 * 音色详情 API
 * GET - 获取音色详情
 * PUT - 更新音色
 * DELETE - 删除音色
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 获取音色详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const voice = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        characters: {
          select: {
            id: true,
            name: true,
            frontView: true,
          },
        },
      },
    });

    if (!voice) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ voice });
  } catch (error) {
    console.error("[Voice API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice" },
      { status: 500 }
    );
  }
}

// 更新音色
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证所有权
    const existing = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      providerVoiceId,
      previewUrl,
      previewText,
      language,
      gender,
      ageGroup,
      style,
      tags,
      isDefault,
      cloneStatus,
      cloneTaskId,
    } = body;

    const voice = await prisma.voice.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(providerVoiceId !== undefined && { providerVoiceId }),
        ...(previewUrl !== undefined && { previewUrl }),
        ...(previewText !== undefined && { previewText }),
        ...(language !== undefined && { language }),
        ...(gender !== undefined && { gender }),
        ...(ageGroup !== undefined && { ageGroup }),
        ...(style !== undefined && { style }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(isDefault !== undefined && { isDefault }),
        ...(cloneStatus !== undefined && { cloneStatus }),
        ...(cloneTaskId !== undefined && { cloneTaskId }),
      },
    });

    return NextResponse.json({ voice });
  } catch (error) {
    console.error("[Voice API] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update voice" },
      { status: 500 }
    );
  }
}

// 删除音色
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 验证所有权
    const existing = await prisma.voice.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Voice not found" },
        { status: 404 }
      );
    }

    // 软删除
    await prisma.voice.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Voice API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete voice" },
      { status: 500 }
    );
  }
}
