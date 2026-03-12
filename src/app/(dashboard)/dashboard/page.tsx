import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder, Users, Image, Clapperboard } from "lucide-react";

async function getStats(userId: string) {
  const [projectCount, characterCount, sceneCount, storyboardCount] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.character.count({ where: { project: { userId } } }),
    prisma.scene.count({ where: { project: { userId } } }),
    prisma.storyboard.count({ where: { project: { userId } } }),
  ]);

  return {
    projectCount,
    characterCount,
    sceneCount,
    storyboardCount,
  };
}

async function getRecentProjects(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: {
          characters: true,
          scenes: true,
          storyboards: true,
        },
      },
    },
  });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const stats = await getStats(session.user.id);
  const projects = await getRecentProjects(session.user.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
          <p className="text-muted-foreground">
            欢迎回来，{session.user.name || session.user.email}
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="项目总数"
          value={stats.projectCount}
          icon={Folder}
          description="创建的项目"
        />
        <StatCard
          title="角色数量"
          value={stats.characterCount}
          icon={Users}
          description="设计的角色"
        />
        <StatCard
          title="场景数量"
          value={stats.sceneCount}
          icon={Image}
          description="构建的场景"
        />
        <StatCard
          title="分镜数量"
          value={stats.storyboardCount}
          icon={Clapperboard}
          description="制作的分镜"
        />
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>最近项目</CardTitle>
              <CardDescription>您最近编辑的项目</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="outline" size="sm">查看全部</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">还没有项目</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                创建您的第一个漫剧项目，开始创作之旅
              </p>
              <Link href="/dashboard/projects/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新建项目
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{project.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {project._count.characters} 角色 · {project._count.scenes} 场景 · {project._count.storyboards} 分镜
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      {project.status === "DRAFT" ? "草稿" : project.status === "IN_PROGRESS" ? "进行中" : "已完成"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}