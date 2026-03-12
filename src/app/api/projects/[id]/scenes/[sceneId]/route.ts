import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSceneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
  atmosphere: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  wideShot: z.string().optional().nullable(),
  fullShot: z.string().optional().nullable(),
  mediumShot: z.string().optional().nullable(),
  closeUp: z.string().optional().nullable(),
});

// GET /api/projects/[id]/scenes/[sceneId] - 获取场景详情
export async function GET(
  req: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scene = await prisma.scene.findFirst({
      where: {
        id: params.sceneId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Failed to fetch scene:", error);
    return NextResponse.json(
      { error: "Failed to fetch scene" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/scenes/[sceneId] - 更新场景
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSceneSchema.parse(body);

    const scene = await prisma.scene.updateMany({
      where: {
        id: params.sceneId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
      data,
    });

    if (scene.count === 0) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update scene:", error);
    return NextResponse.json(
      { error: "Failed to update scene" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/scenes/[sceneId] - 删除场景
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scene = await prisma.scene.deleteMany({
      where: {
        id: params.sceneId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
    });

    if (scene.count === 0) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete scene:", error);
    return NextResponse.json(
      { error: "Failed to delete scene" },
      { status: 500 }
    );
  }
}