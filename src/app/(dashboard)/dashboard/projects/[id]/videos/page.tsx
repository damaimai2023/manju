"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Film,
  MoreHorizontal,
  Play,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Video, VideoStatus, VideoStatusLabels } from "@/types";
import { getVideoStatusColor, formatDuration } from "@/lib/video";
import { toast } from "@/components/ui/use-toast";

// API functions
const fetchVideos = async (projectId: string): Promise<Video[]> => {
  const response = await fetch(`/api/projects/${projectId}/videos`);
  if (!response.ok) throw new Error("获取视频列表失败");
  return response.json();
};

const deleteVideo = async ({
  projectId,
  videoId,
}: {
  projectId: string;
  videoId: string;
}): Promise<void> => {
  const response = await fetch(
    `/api/projects/${projectId}/videos/${videoId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error("删除视频失败");
};

export default function VideosPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos", projectId],
    queryFn: () => fetchVideos(projectId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos", projectId] });
      toast({
        title: "删除成功",
        description: "视频已删除",
      });
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
    },
    onError: () => {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (video: Video) => {
    setVideoToDelete(video);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (videoToDelete) {
      deleteMutation.mutate({ projectId, videoId: videoToDelete.id });
    }
  };

  const getStatusIcon = (status: VideoStatus) => {
    switch (status) {
      case "COMPLETED":
      case "EXPORTED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "GENERATING":
      case "EXPORTING":
      case "RENDERING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">视频管理</h1>
            <p className="text-muted-foreground mt-1">
              管理和导出漫剧视频
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">视频管理</h1>
          <p className="text-muted-foreground mt-1">
            管理和导出漫剧视频
          </p>
        </div>
        <Button onClick={() => router.push(`/dashboard/projects/${projectId}/videos/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          新建视频
        </Button>
      </div>

      {videos && videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() =>
                router.push(`/dashboard/projects/${projectId}/videos/${video.id}`)
              }
            >
              <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                {video.coverImage ? (
                  <img
                    src={video.coverImage}
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
                    <Film className="h-16 w-16 text-purple-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="secondary"
                    className={getVideoStatusColor(video.status)}
                  >
                    {getStatusIcon(video.status)}
                    <span className="ml-1">{VideoStatusLabels[video.status]}</span>
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {video.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {video.description || "暂无描述"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/dashboard/projects/${projectId}/videos/${video.id}`
                          );
                        }}
                      >
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(video);
                        }}
                      >
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatDuration(video.duration)}</span>
                  <span>{video._count?.clips || 0} 个片段</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  更新于{" "}
                  {format(new Date(video.updatedAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN,
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Film className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">还没有视频</h3>
          <p className="text-muted-foreground mb-6">
            从分镜导入或创建空白视频开始制作
          </p>
          <Button
            onClick={() =>
              router.push(`/dashboard/projects/${projectId}/videos/new`)
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            创建第一个视频
          </Button>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除视频 &quot;{videoToDelete?.name}&quot; 吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
