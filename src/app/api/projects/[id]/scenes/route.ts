import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSceneSchema = z.object({
  name: z.string().min(1, "场景名称不能为空"),
  description: z.string().optional(),
  timeOfDay: z.string().optional(),
  atmosphere: z.string().optional(),
  style: z.string().optional(),
});

// GET /api/projects/[id]/scenes - 获取项目的所有场景
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const scenes = await prisma.scene.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(scenes);
  } catch (error) {
    console.error("Failed to fetch scenes:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenes" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/scenes - 创建新场景
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = createSceneSchema.parse(body);

    const scene = await prisma.scene.create({
      data: {
        ...data,
        projectId: params.id,
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create scene:", error);
    return NextResponse.json(
      { error: "Failed to create scene" },
      { status: 500 }
    );
  }
}