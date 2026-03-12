import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createPropSchema = z.object({
  name: z.string().min(1, "道具名称不能为空"),
  description: z.string().optional(),
  image: z.string().optional(),
  category: z.string().optional(),
});

// GET /api/projects/[id]/props - 获取项目的所有道具
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

    const props = await prisma.prop.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(props);
  } catch (error) {
    console.error("Failed to fetch props:", error);
    return NextResponse.json(
      { error: "Failed to fetch props" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/props - 创建新道具
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
    const data = createPropSchema.parse(body);

    const prop = await prisma.prop.create({
      data: {
        ...data,
        projectId: params.id,
      },
    });

    return NextResponse.json(prop, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create prop:", error);
    return NextResponse.json(
      { error: "Failed to create prop" },
      { status: 500 }
    );
  }
}