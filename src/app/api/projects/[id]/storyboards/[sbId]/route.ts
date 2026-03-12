import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateStoryboardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  episodeId: z.string().optional().nullable(),
});

// GET /api/projects/[id]/storyboards/[sbId] - 获取分镜详情
export async function GET(
  req: Request,
  { params }: { params: { id: string; sbId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storyboard = await prisma.storyboard.findFirst({
      where: {
        id: params.sbId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
      include: {
        shots: {
          orderBy: { shotNo: "asc" },
          include: {
            character: true,
            scene: true,
          },
        },
        _count: {
          select: { shots: true },
        },
      },
    });

    if (!storyboard) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    return NextResponse.json(storyboard);
  } catch (error) {
    console.error("Failed to fetch storyboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch storyboard" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/storyboards/[sbId] - 更新分镜
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; sbId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateStoryboardSchema.parse(body);

    const storyboard = await prisma.storyboard.updateMany({
      where: {
        id: params.sbId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
      data,
    });

    if (storyboard.count === 0) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update storyboard:", error);
    return NextResponse.json(
      { error: "Failed to update storyboard" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/storyboards/[sbId] - 删除分镜
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; sbId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storyboard = await prisma.storyboard.deleteMany({
      where: {
        id: params.sbId,
        projectId: params.id,
        project: { userId: session.user.id },
      },
    });

    if (storyboard.count === 0) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete storyboard:", error);
    return NextResponse.json(
      { error: "Failed to delete storyboard" },
      { status: 500 }
    );
  }
}