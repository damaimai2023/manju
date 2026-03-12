"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings,
  Film,
  Wand2,
  Download,
  Upload,
  Clock,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Video, VideoClip, VideoGenerationTask, VideoStatus, ClipStatus } from "@/types";
import {
  formatDuration,
  getVideoStatusColor,
  getClipStatusColor,
  generateThumbnailUrl,
} from "@/lib/video";
import { EXPORT_OPTIONS } from "@/lib/video";
import { estimateFileSize } from "@/lib/video-export";;
import { cn } from "@/lib/utils";

// API functions
const fetchVideo = async (projectId: string, videoId: string): Promise<Video> => {
  const response = await fetch(`/api/projects/${projectId}/videos/${videoId}`);
  if (!response.ok) throw new Error("获取视频详情失败");
  return response.json();
};

const generateVideo = async ({
  projectId,
  videoId,
  clipId,
}: {
  projectId: string;
  videoId: string;
  clipId?: string;
}): Promise<{ tasks: string[] }> => {
  const response = await fetch(
    `/api/projects/${projectId}/videos/${videoId}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clipId ? { shotId: clipId } : {}),
    }
  );
  if (!response.ok) throw new Error("触发生成失败");
  return response.json();
};

const exportVideo = async ({
  projectId,
  videoId,
  config,
}: {
  projectId: string;
  videoId: string;
  config: { resolution: string; frameRate: number; format: string };
}): Promise<{ taskId: string; estimatedSize: number }> => {
  const response = await fetch(
    `/api/projects/${projectId}/videos/${videoId}/export`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }
  );
  if (!response.ok) throw new Error("触发导出失败");
  return response.json();
};

export default function VideoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;
  const videoId = params.videoId as string;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    resolution: "1080p",
    frameRate: 24,
    format: "mp4",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", projectId, videoId],
    queryFn: () => fetchVideo(projectId, videoId),
    refetchInterval: (data) => {
      // 如果视频正在生成或导出中，每2秒刷新一次
      if (data?.state?.data?.status === "GENERATING" || data?.state?.data?.status === "EXPORTING") {
        return 2000;
      }
      return false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video", projectId, videoId] });
      toast({
        title: "生成已开始",
        description: "AI正在生成视频，请稍候",
      });
    },
    onError: () => {
      toast({
        title: "生成失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportVideo,
    onSuccess: () => {
      setShowExportDialog(false);
      queryClient.invalidateQueries({ queryKey: ["video", projectId, videoId] });
      toast({
        title: "导出已开始",
        description: "视频正在导出，请稍候",
      });
    },
    onError: (error) => {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleGenerate = (clip?: VideoClip) => {
    generateMutation.mutate({
      projectId,
      videoId,
      clipId: clip?.shotId,
    });
  };

  const handleExport = () => {
    exportMutation.mutate({
      projectId,
      videoId,
      config: exportConfig,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, clip: VideoClip) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clipId", clip.id);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/videos/${videoId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("上传失败");

      queryClient.invalidateQueries({ queryKey: ["video", projectId, videoId] });
      toast({
        title: "上传成功",
        description: "视频片段已更新",
      });
    } catch (error) {
      toast({
        title: "上传失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const getCurrentClip = () => {
    if (!video?.clips) return null;
    return video.clips.find(
      (clip) =>
        currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration
    );
  };

  const currentClip = getCurrentClip();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && video) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= video.duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 100;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, video]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>视频不存在</p>
      </div>
    );
  }

  const pendingClips = video.clips?.filter(
    (c) => c.status === "PENDING" || c.status === "FAILED"
  );
  const completedClips = video.clips?.filter(
    (c) => c.status === "COMPLETED" || c.status === "UPLOADED"
  );
  const canExport = completedClips?.length === video.clips?.length && video.clips?.length > 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/projects/${projectId}/videos`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{video.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className={getVideoStatusColor(video.status)}>
                {video.status}
              </Badge>
              <span>{formatDuration(video.duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate()}
            disabled={generateMutation.isPending || pendingClips?.length === 0}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            生成全部
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            disabled={!canExport || video.status === "EXPORTING"}
          >
            <Download className="h-4 w-4 mr-2" />
            {video.status === "EXPORTING" ? "导出中..." : "导出视频"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Preview */}
        <div className="flex-1 flex flex-col border-r">
          {/* Preview Area */}
          <div className="flex-1 bg-black flex items-center justify-center p-8">
            <div className="relative w-full max-w-3xl aspect-video bg-muted rounded-lg overflow-hidden">
              {currentClip?.videoUrl ? (
                <video
                  src={currentClip.videoUrl}
                  className="w-full h-full object-contain"
                  controls={false}
                />
              ) : currentClip?.thumbnail ? (
                <img
                  src={currentClip.thumbnail}
                  alt={currentClip.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
                  <Film className="h-24 w-24 text-white/30" />
                </div>
              )}

              {/* Time Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-white text-sm font-mono">
                {formatDuration(currentTime)} / {formatDuration(video.duration)}
              </div>

              {/* Status Overlay */}
              {currentClip && (
                <div className="absolute top-4 right-4">
                  <Badge className={getClipStatusColor(currentClip.status)}>
                    {currentClip.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="border-t p-4 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentTime(0)}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button size="icon" onClick={handlePlayPause}>
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentTime(video.duration)}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-16">
                {formatDuration(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={video.duration}
                step={100}
                onValueChange={(value) => setCurrentTime(value[0])}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-16 text-right">
                {formatDuration(video.duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Clip List */}
        <div className="w-80 border-l flex flex-col bg-muted/30">
          <div className="p-4 border-b">
            <h2 className="font-semibold">片段列表</h2>
            <p className="text-sm text-muted-foreground">
              {completedClips?.length || 0}/{video.clips?.length || 0} 已就绪
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {video.clips?.map((clip) => (
              <Card
                key={clip.id}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedClip?.id === clip.id && "ring-2 ring-primary",
                  currentClip?.id === clip.id && "border-primary"
                )}
                onClick={() => {
                  setSelectedClip(clip);
                  setCurrentTime(clip.startTime);
                }}
              >
                <div className="relative aspect-video bg-muted rounded-t-sm overflow-hidden">
                  {clip.thumbnail ? (
                    <img
                      src={clip.thumbnail}
                      alt={clip.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Film className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1">
                    <Badge variant="secondary" className={cn("text-xs", getClipStatusColor(clip.status))}>
                      {clip.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{clip.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(clip.duration)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(clip.status === "PENDING" || clip.status === "FAILED") && (
                          <DropdownMenuItem onClick={() => handleGenerate(clip)}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            AI生成
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          上传视频
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, clip)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="h-48 border-t bg-muted/30 p-4 overflow-x-auto">
        <div className="relative h-full" style={{ width: Math.max(800, video.duration / 10) }}>
          {/* Time Ruler */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b flex">
            {Array.from({ length: Math.ceil(video.duration / 1000) + 1 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-xs text-muted-foreground border-l pl-1"
                style={{ width: 100 }}
              >
                {formatDuration(i * 1000)}
              </div>
            ))}
          </div>

          {/* Video Track */}
          <div className="absolute top-8 left-0 right-0 h-16 bg-card rounded border">
            {video.clips?.map((clip) => (
              <div
                key={clip.id}
                className={cn(
                  "absolute top-1 bottom-1 rounded cursor-pointer transition-all overflow-hidden",
                  clip.status === "COMPLETED" || clip.status === "UPLOADED"
                    ? "bg-green-100 border border-green-300"
                    : clip.status === "GENERATING"
                    ? "bg-yellow-100 border border-yellow-300"
                    : "bg-gray-100 border border-gray-300"
                )}
                style={{
                  left: clip.startTime / 10,
                  width: clip.duration / 10,
                }}
                onClick={() => {
                  setSelectedClip(clip);
                  setCurrentTime(clip.startTime);
                }}
              >
                {clip.thumbnail && (
                  <img
                    src={clip.thumbnail}
                    alt=""
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium truncate px-2">{clip.name}</span>
                </div>
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
              style={{ left: currentTime / 10 }}
            >
              <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-primary rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出视频</DialogTitle>
            <DialogDescription>选择导出参数并开始导出</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">分辨率</label>
              <div className="grid grid-cols-2 gap-2">
                {EXPORT_OPTIONS.resolutions.map((res) => (
                  <Button
                    key={res.value}
                    variant={exportConfig.resolution === res.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setExportConfig((prev) => ({ ...prev, resolution: res.value }))
                    }
                  >
                    {res.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">帧率</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPORT_OPTIONS.frameRates.map((fps) => (
                  <Button
                    key={fps.value}
                    variant={exportConfig.frameRate === fps.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setExportConfig((prev) => ({ ...prev, frameRate: fps.value }))
                    }
                  >
                    {fps.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">格式</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPORT_OPTIONS.formats.map((fmt) => (
                  <Button
                    key={fmt.value}
                    variant={exportConfig.format === fmt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setExportConfig((prev) => ({ ...prev, format: fmt.value }))
                    }
                  >
                    {fmt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-muted p-3 rounded text-sm">
              <p className="text-muted-foreground">
                预计文件大小: {" "}
                <span className="font-medium text-foreground">
                  {estimateFileSize(video.duration, exportConfig)} MB
                </span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleExport} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  开始导出
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
