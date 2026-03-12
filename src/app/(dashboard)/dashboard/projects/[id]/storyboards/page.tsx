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
  Clapperboard, 
  ArrowLeft,
  Loader2,
  Film,
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
import type { Storyboard } from "@/types";

export default function StoryboardsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStoryboards();
  }, [projectId]);

  const fetchStoryboards = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/storyboards`);
      if (response.ok) {
        const data = await response.json();
        setStoryboards(data);
      }
    } catch (error) {
      toast({
        title: "获取分镜失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStoryboard = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/storyboards/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStoryboards(storyboards.filter((s) => s.id !== id));
        toast({ title: "分镜已删除" });
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

  const filteredStoryboards = storyboards.filter((s) =>
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
            <h1 className="text-3xl font-bold tracking-tight">分镜管理</h1>
            <p className="text-muted-foreground">管理项目中的分镜</p>
          </div>
        </div>
        <Link href={`/dashboard/projects/${projectId}/storyboards/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建分镜
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索分镜..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Storyboards Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredStoryboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clapperboard className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchQuery ? "未找到匹配的分镜" : "还没有分镜"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? "尝试其他搜索词" : "创建您的第一个分镜"}
            </p>
            {!searchQuery && (
              <Link href={`/dashboard/projects/${projectId}/storyboards/new`} className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  创建分镜
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStoryboards.map((storyboard) => (
            <Card key={storyboard.id} className="group overflow-hidden">
              <CardContent className="p-0">
                {/* Preview */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Film className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center space-x-2">
                    <Link href={`/dashboard/projects/${projectId}/storyboards/${storyboard.id}`}>
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
                          <Link href={`/dashboard/projects/${projectId}/storyboards/${storyboard.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteStoryboard(storyboard.id)}
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
                      <h3 className="font-semibold truncate">{storyboard.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {storyboard.description || "暂无描述"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary">
                      {(storyboard as any)._count?.shots || 0} 个镜头
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(storyboard.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
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