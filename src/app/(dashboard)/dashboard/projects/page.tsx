"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Folder, Search, MoreHorizontal, Loader2, Users, Image, Clapperboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      toast({
        title: "获取项目失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== id));
        toast({ title: "项目已删除" });
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">项目管理</h1>
          <p className="text-muted-foreground">管理您的漫剧项目</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索项目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? "未找到匹配的项目" : "还没有项目"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "尝试其他搜索词" : "创建您的第一个漫剧项目"}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/projects/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新建项目
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="group overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/projects/${project.id}`}>
                          查看详情
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteProject(project.id)}
                      >
                        删除项目
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {project.description || "暂无描述"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="mr-1 h-3 w-3" />
                      {(project as any)._count?.characters || 0}
                    </span>
                    <span className="flex items-center">
                      <Image className="mr-1 h-3 w-3" />
                      {(project as any)._count?.scenes || 0}
                    </span>
                    <span className="flex items-center">
                      <Clapperboard className="mr-1 h-3 w-3" />
                      {(project as any)._count?.storyboards || 0}
                    </span>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}