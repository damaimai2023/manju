import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createCharacterSchema = z.object({
  name: z.string().min(1, "角色名称不能为空"),
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

// GET /api/projects/[id]/characters - 获取项目的所有角色
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const characters = await prisma.character.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/characters - 创建新角色
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = createCharacterSchema.parse(body);

    const character = await prisma.character.create({
      data: {
        ...data,
        projectId: params.id,
        appearance: data.appearance ? JSON.stringify(data.appearance) : null,
        features: data.features ? JSON.stringify(data.features) : null,
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create character:", error);
    return NextResponse.json(
      { error: "Failed to create character" },
      { status: 500 }
    );
  }
}