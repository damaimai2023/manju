import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createShotSchema = z.object({
  shotNo: z.number().optional(),
  shotSize: z.enum(["EXTREME_LONG", "LONG", "FULL", "MEDIUM", "CLOSE_UP", "EXTREME_CLOSE"]).default("MEDIUM"),
  cameraAngle: z.enum(["EYE_LEVEL", "LOW_ANGLE", "HIGH_ANGLE", "DUTCH_ANGLE", "OVER_SHOULDER"]).default("EYE_LEVEL"),
  cameraMove: z.enum(["STATIC", "PAN", "TILT", "DOLLY", "TRUCK", "CRANE"]).default("STATIC"),
  duration: z.number().optional(),
  description: z.string().optional(),
  dialogue: z.string().optional(),
  narration: z.string().optional(),
  action: z.string().optional(),
  characterId: z.string().optional().nullable(),
  sceneId: z.string().optional().nullable(),
  propIds: z.array(z.string()).optional(),
});

// GET /api/projects/[id]/storyboards/[sbId]/shots - 获取分镜的所有镜头
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
    });

    if (!storyboard) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    const shots = await prisma.shot.findMany({
      where: { storyboardId: params.sbId },
      orderBy: { shotNo: "asc" },
      include: {
        character: true,
        scene: true,
      },
    });

    return NextResponse.json(shots);
  } catch (error) {
    console.error("Failed to fetch shots:", error);
    return NextResponse.json(
      { error: "Failed to fetch shots" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/storyboards/[sbId]/shots - 创建新镜头
export async function POST(
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
    });

    if (!storyboard) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = createShotSchema.parse(body);

    // Get max shotNo if not provided
    let shotNo = data.shotNo;
    if (!shotNo) {
      const lastShot = await prisma.shot.findFirst({
        where: { storyboardId: params.sbId },
        orderBy: { shotNo: "desc" },
      });
      shotNo = (lastShot?.shotNo || 0) + 1;
    }

    const shot = await prisma.shot.create({
      data: {
        ...data,
        shotNo,
        storyboardId: params.sbId,
        propIds: data.propIds ? JSON.stringify(data.propIds) : "[]",
      },
    });

    return NextResponse.json(shot, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create shot:", error);
    return NextResponse.json(
      { error: "Failed to create shot" },
      { status: 500 }
    );
  }
}