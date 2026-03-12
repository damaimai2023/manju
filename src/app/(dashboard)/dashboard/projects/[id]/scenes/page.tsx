"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Image, 
  ArrowLeft,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Scene } from "@/types";

export default function ScenesPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchScenes();
  }, [projectId]);

  const fetchScenes = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`);
      if (response.ok) {
        const data = await response.json();
        setScenes(data);
      }
    } catch (error) {
      toast({
        title: "获取场景失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteScene = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setScenes(scenes.filter((s) => s.id !== id));
        toast({ title: "场景已删除" });
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

  const filteredScenes = scenes.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">场景管理</h1>
            <p className="text-muted-foreground">管理项目中的场景</p>
          </div>
        </div>
        <Link href={`/dashboard/projects/${projectId}/scenes/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建场景
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索场景..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Scenes Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredScenes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? "未找到匹配的场景" : "还没有场景"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "尝试其他搜索词" : "创建您的第一个场景"}
            </p>
            {!searchQuery && (
              <Link href={`/dashboard/projects/${projectId}/scenes/new`} className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建场景
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredScenes.map((scene) => (
            <Card key={scene.id} className="group overflow-hidden">
              <CardContent className="p-0">
                {/* Image */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {scene.wideShot ? (
                    <img
                      src={scene.wideShot}
                      alt={scene.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-green-500/20">
                      <Image className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center space-x-2">
                    <Link href={`/dashboard/projects/${projectId}/scenes/${scene.id}`}>
                      <Button size="sm" variant="secondary">
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Delete Button */}
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/projects/${projectId}/scenes/${scene.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteScene(scene.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold truncate">{scene.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {scene.description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {scene.timeOfDay && (
                      <Badge variant="secondary" className="text-xs">
                        {scene.timeOfDay}
                      </Badge>
                    )}
                    {scene.atmosphere && (
                      <Badge variant="secondary" className="text-xs">
                        {scene.atmosphere}
                      </Badge>
                    )}
                    {scene.style && (
                      <Badge variant="secondary" className="text-xs">
                        {scene.style}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}