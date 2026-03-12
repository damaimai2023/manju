import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateShotSchema = z.object({
  shotSize: z.enum(["EXTREME_LONG", "LONG", "FULL", "MEDIUM", "CLOSE_UP", "EXTREME_CLOSE"]).optional(),
  cameraAngle: z.enum(["EYE_LEVEL", "LOW_ANGLE", "HIGH_ANGLE", "DUTCH_ANGLE", "OVER_SHOULDER"]).optional(),
  cameraMove: z.enum(["STATIC", "PAN", "TILT", "DOLLY", "TRUCK", "CRANE"]).optional(),
  duration: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  dialogue: z.string().optional().nullable(),
  narration: z.string().optional().nullable(),
  action: z.string().optional().nullable(),
  characterId: z.string().optional().nullable(),
  sceneId: z.string().optional().nullable(),
  propIds: z.array(z.string()).optional(),
  prompt: z.string().optional().nullable(),
  generatedImage: z.string().optional().nullable(),
  status: z.enum(["PENDING", "GENERATING", "COMPLETED", "FAILED"]).optional(),
});

// PATCH /api/projects/[id]/storyboards/[sbId]/shots/[shotId] - 更新镜头
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; sbId: string; shotId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateShotSchema.parse(body);

    const shot = await prisma.shot.updateMany({
      where: {
        id: params.shotId,
        storyboardId: params.sbId,
        storyboard: {
          projectId: params.id,
          project: { userId: session.user.id },
        },
      },
      data: {
        ...data,
        propIds: data.propIds ? JSON.stringify(data.propIds) : undefined,
      },
    });

    if (shot.count === 0) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/storyboards/[sbId]/shots/[shotId] - 删除镜头
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; sbId: string; shotId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shot = await prisma.shot.deleteMany({
      where: {
        id: params.shotId,
        storyboardId: params.sbId,
        storyboard: {
          projectId: params.id,
          project: { userId: session.user.id },
        },
      },
    });

    if (shot.count === 0) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete shot:", error);
    return NextResponse.json(
      { error: "Failed to delete shot" },
      { status: 500 }
    );
  }
}