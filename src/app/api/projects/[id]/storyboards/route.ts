import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createStoryboardSchema = z.object({
  name: z.string().min(1, "分镜名称不能为空"),
  description: z.string().optional(),
  episodeId: z.string().optional(),
});

// GET /api/projects/[id]/storyboards - 获取项目的所有分镜
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

    const storyboards = await prisma.storyboard.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { shots: true },
        },
      },
    });

    return NextResponse.json(storyboards);
  } catch (error) {
    console.error("Failed to fetch storyboards:", error);
    return NextResponse.json(
      { error: "Failed to fetch storyboards" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/storyboards - 创建新分镜
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
    const data = createStoryboardSchema.parse(body);

    const storyboard = await prisma.storyboard.create({
      data: {
        ...data,
        projectId: params.id,
      },
    });

    return NextResponse.json(storyboard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create storyboard:", error);
    return NextResponse.json(
      { error: "Failed to create storyboard" },
      { status: 500 }
    );
  }
}