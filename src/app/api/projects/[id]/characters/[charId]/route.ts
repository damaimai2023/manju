import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  appearance: z.any().optional(),
  features: z.any().optional(),
  frontView: z.string().optional(),
  sideView: z.string().optional(),
  backView: z.string().optional(),
  personality: z.string().optional(),
  background: z.string().optional(),
});

// GET /api/projects/[id]/characters/[charId] - 获取角色详情
export async function GET(
  req: Request,
  { params }: { params: { id: string; charId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const character = await prisma.character.findFirst({
      where: {
        id: params.charId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
    });

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Parse JSON fields
    return NextResponse.json({
      ...character,
      appearance: character.appearance ? JSON.parse(character.appearance) : null,
      features: character.features ? JSON.parse(character.features) : null,
    });
  } catch (error) {
    console.error("Failed to fetch character:", error);
    return NextResponse.json(
      { error: "Failed to fetch character" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/characters/[charId] - 更新角色
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; charId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateCharacterSchema.parse(body);

    const character = await prisma.character.updateMany({
      where: {
        id: params.charId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
      data: {
        ...data,
        appearance: data.appearance ? JSON.stringify(data.appearance) : undefined,
        features: data.features ? JSON.stringify(data.features) : undefined,
      },
    });

    if (character.count === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update character:", error);
    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/characters/[charId] - 删除角色
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; charId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const character = await prisma.character.deleteMany({
      where: {
        id: params.charId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
    });

    if (character.count === 0) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete character:", error);
    return NextResponse.json(
      { error: "Failed to delete character" },
      { status: 500 }
    );
  }
}