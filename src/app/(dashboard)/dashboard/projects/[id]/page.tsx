import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  Image, 
  Box, 
  Clapperboard, 
  Film,
  Plus,
  Settings,
  Edit
} from "lucide-react";

async function getProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      characters: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
      storyboards: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          _count: {
            select: { shots: true },
          },
        },
      },
      videos: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
      _count: {
        select: {
          characters: true,
          scenes: true,
          props: true,
          storyboards: true,
          videos: true,
        },
      },
    },
  });

  return project;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await getProject(params.id, session.user.id);
  if (!project) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "草稿", className: "bg-gray-100 text-gray-800" },
      IN_PROGRESS: { label: "进行中", className: "bg-blue-100 text-blue-800" },
      COMPLETED: { label: "已完成", className: "bg-green-100 text-green-800" },
      ARCHIVED: { label: "已归档", className: "bg-yellow-100 text-yellow-800" },
    };
    const { label, className } = variants[status] || variants.DRAFT;
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                {getStatusBadge(project.status)}
              </div>
              <p className="text-muted-foreground">
                {project.description || "暂无描述"}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard
          title="角色"
          value={project._count.characters}
          icon={Users}
          href={`/dashboard/projects/${project.id}/characters`}
        />
        <StatCard
          title="场景"
          value={project._count.scenes}
          icon={Image}
          href={`/dashboard/projects/${project.id}/scenes`}
        />
        <StatCard
          title="道具"
          value={project._count.props}
          icon={Box}
          href={`/dashboard/projects/${project.id}/props`}
        />
        <StatCard
          title="分镜"
          value={project._count.storyboards}
          icon={Clapperboard}
          href={`/dashboard/projects/${project.id}/storyboards`}
        />
        <StatCard
          title="视频"
          value={project._count.videos}
          icon={Film}
          href={`/dashboard/projects/${project.id}/videos`}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="characters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="characters">
            <Users className="mr-2 h-4 w-4" />
            角色
          </TabsTrigger>
          <TabsTrigger value="scenes">
            <Image className="mr-2 h-4 w-4" />
            场景
          </TabsTrigger>
          <TabsTrigger value="storyboards">
            <Clapperboard className="mr-2 h-4 w-4" />
            分镜
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Film className="mr-2 h-4 w-4" />
            视频
          </TabsTrigger>
        </TabsList>

        {/* Characters Tab */}
        <TabsContent value="characters" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">角色列表</h2>
            <Link href={`/dashboard/projects/${project.id}/characters/new`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建角色
              </Button>
            </Link>
          </div>
          
          {project.characters.length === 0 ? (
            <EmptyState
              icon={Users}
              title="还没有角色"
              description="创建您的第一个角色，开始构建故事世界"
              actionHref={`/dashboard/projects/${project.id}/characters/new`}
              actionLabel="创建角色"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {project.characters.map((character) => (
                <Link
                  key={character.id}
                  href={`/dashboard/projects/${project.id}/characters/${character.id}`}
                >
                  <Card className="group overflow-hidden transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="aspect-square overflow-hidden rounded-lg bg-muted mb-3">
                        {character.frontView ? (
                          <img
                            src={character.frontView}
                            alt={character.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Users className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{character.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {character.description || "暂无描述"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          {project.characters.length > 0 && (
            <div className="text-center">
              <Link href={`/dashboard/projects/${project.id}/characters`}>
                <Button variant="outline">查看全部角色</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Scenes Tab */}
        <TabsContent value="scenes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">场景列表</h2>
            <Link href={`/dashboard/projects/${project.id}/scenes/new`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建场景
              </Button>
            </Link>
          </div>
          
          {project.scenes.length === 0 ? (
            <EmptyState
              icon={Image}
              title="还没有场景"
              description="创建故事发生的场景，让角色有处可去"
              actionHref={`/dashboard/projects/${project.id}/scenes/new`}
              actionLabel="创建场景"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {project.scenes.map((scene) => (
                <Link
                  key={scene.id}
                  href={`/dashboard/projects/${project.id}/scenes/${scene.id}`}
                >
                  <Card className="group overflow-hidden transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="aspect-video overflow-hidden rounded-lg bg-muted mb-3">
                        {scene.wideShot ? (
                          <img
                            src={scene.wideShot}
                            alt={scene.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Image className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{scene.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {scene.description || "暂无描述"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          {project.scenes.length > 0 && (
            <div className="text-center">
              <Link href={`/dashboard/projects/${project.id}/scenes`}>
                <Button variant="outline">查看全部场景</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Storyboards Tab */}
        <TabsContent value="storyboards" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分镜列表</h2>
            <Link href={`/dashboard/projects/${project.id}/storyboards/new`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建分镜
              </Button>
            </Link>
          </div>
          
          {project.storyboards.length === 0 ? (
            <EmptyState
              icon={Clapperboard}
              title="还没有分镜"
              description="创建分镜，将故事转化为可视化的画面序列"
              actionHref={`/dashboard/projects/${project.id}/storyboards/new`}
              actionLabel="创建分镜"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {project.storyboards.map((storyboard: any) => (
                <Link
                  key={storyboard.id}
                  href={`/dashboard/projects/${project.id}/storyboards/${storyboard.id}`}
                >
                  <Card className="group overflow-hidden transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="aspect-video overflow-hidden rounded-lg bg-muted mb-3">
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <Film className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      </div>
                      <h3 className="font-semibold truncate">{storyboard.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {storyboard._count.shots} 个镜头
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          {project.storyboards.length > 0 && (
            <div className="text-center">
              <Link href={`/dashboard/projects/${project.id}/storyboards`}>
                <Button variant="outline">查看全部分镜</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">视频列表</h2>
            <Link href={`/dashboard/projects/${project.id}/videos/new`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建视频
              </Button>
            </Link>
          </div>

          {project.videos.length === 0 ? (
            <EmptyState
              icon={Film}
              title="还没有视频"
              description="从分镜导入或创建空白视频，开始制作漫剧"
              actionHref={`/dashboard/projects/${project.id}/videos/new`}
              actionLabel="创建视频"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {project.videos.map((video: any) => (
                <Link
                  key={video.id}
                  href={`/dashboard/projects/${project.id}/videos/${video.id}`}
                >
                  <Card className="group overflow-hidden transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="aspect-video overflow-hidden rounded-lg bg-muted mb-3">
                        {video.coverImage ? (
                          <img
                            src={video.coverImage}
                            alt={video.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            <Film className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{video.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(video.duration / 1000)} 秒 • {video.status}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {project.videos.length > 0 && (
            <div className="text-center">
              <Link href={`/dashboard/projects/${project.id}/videos`}>
                <Button variant="outline">查看全部视频</Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
        <Link href={actionHref} className="mt-4">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}