"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileVideo,
  LayoutGrid,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Storyboard, CreateVideoInput, Video } from "@/types";
import { toast } from "@/components/ui/use-toast";

const steps = [
  { id: "source", title: "选择来源", description: "选择视频创建方式" },
  { id: "storyboard", title: "选择分镜", description: "选择要导入的分镜" },
  { id: "config", title: "配置参数", description: "设置视频参数" },
  { id: "confirm", title: "确认创建", description: "确认并创建视频" },
];

const fetchStoryboards = async (projectId: string): Promise<Storyboard[]> => {
  const response = await fetch(`/api/projects/${projectId}/storyboards`);
  if (!response.ok) throw new Error("获取分镜列表失败");
  return response.json();
};

const createVideo = async ({
  projectId,
  data,
}: {
  projectId: string;
  data: CreateVideoInput;
}): Promise<Video> => {
  const response = await fetch(`/api/projects/${projectId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("创建视频失败");
  return response.json();
};

export default function NewVideoPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [sourceType, setSourceType] = useState<"blank" | "storyboard">("storyboard");
  const [selectedStoryboard, setSelectedStoryboard] = useState<string>("");
  const [videoName, setVideoName] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [resolution, setResolution] = useState("1080p");
  const [frameRate, setFrameRate] = useState("24");

  const { data: storyboards, isLoading: isLoadingStoryboards } = useQuery({
    queryKey: ["storyboards", projectId],
    queryFn: () => fetchStoryboards(projectId),
    enabled: sourceType === "storyboard",
  });

  const createMutation = useMutation({
    mutationFn: createVideo,
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ["videos", projectId] });
      toast({
        title: "创建成功",
        description: "视频已创建",
      });
      router.push(`/dashboard/projects/${projectId}/videos/${video.id}`);
    },
    onError: () => {
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        if (sourceType === "blank") return true;
        return !!selectedStoryboard;
      case 2:
        return !!videoName;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleCreate = () => {
    const data: CreateVideoInput = {
      name: videoName,
      description: videoDescription,
      ...(sourceType === "storyboard" && selectedStoryboard && {
        storyboardId: selectedStoryboard,
      }),
    };

    createMutation.mutate({ projectId, data });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <RadioGroup
            value={sourceType}
            onValueChange={(value: "blank" | "storyboard") => {
              setSourceType(value);
              if (value === "blank") {
                setSelectedStoryboard("");
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="storyboard"
                id="storyboard"
                className="peer sr-only"
              />
              <Label
                htmlFor="storyboard"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <LayoutGrid className="h-8 w-8 mb-4" />
                <div className="text-center">
                  <div className="font-semibold">从分镜导入</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    使用已创建的分镜自动生成视频片段
                  </div>
                </div>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="blank"
                id="blank"
                className="peer sr-only"
              />
              <Label
                htmlFor="blank"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <FileVideo className="h-8 w-8 mb-4" />
                <div className="text-center">
                  <div className="font-semibold">空白视频</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    从头开始创建视频
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        );

      case 1:
        if (sourceType === "blank") {
          return (
            <div className="text-center py-8">
              <Check className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">已选择空白视频</h3>
              <p className="text-muted-foreground mt-2">
                您将在下一步配置视频参数
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {isLoadingStoryboards ? (
              <div className="text-center py-8">加载中...</div>
            ) : storyboards && storyboards.length > 0 ? (
              <RadioGroup
                value={selectedStoryboard}
                onValueChange={setSelectedStoryboard}
                className="space-y-3"
              >
                {storyboards.map((storyboard) => (
                  <div key={storyboard.id}>
                    <RadioGroupItem
                      value={storyboard.id}
                      id={storyboard.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={storyboard.id}
                      className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold">{storyboard.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {storyboard.description || "暂无描述"} •{" "}
                          {storyboard.shotCount || 0} 个镜头
                        </div>
                      </div>
                      {selectedStoryboard === storyboard.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无分镜</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/dashboard/projects/${projectId}/storyboards/new`)}
                >
                  创建分镜
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                视频名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder="输入视频名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">视频描述</Label>
              <Textarea
                id="description"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="输入视频描述（可选）"
                rows={3}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resolution">分辨率</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger id="resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p (SD)</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (FHD)</SelectItem>
                    <SelectItem value="4K">4K (UHD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frameRate">帧率</Label>
                <Select value={frameRate} onValueChange={setFrameRate}>
                  <SelectTrigger id="frameRate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 fps (电影)</SelectItem>
                    <SelectItem value="30">30 fps (标准)</SelectItem>
                    <SelectItem value="60">60 fps (流畅)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建方式</span>
                <span className="font-medium">
                  {sourceType === "storyboard" ? "从分镜导入" : "空白视频"}
                </span>
              </div>
              {sourceType === "storyboard" && selectedStoryboard && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">导入分镜</span>
                  <span className="font-medium">
                    {storyboards?.find((s) => s.id === selectedStoryboard)?.name}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">视频名称</span>
                <span className="font-medium">{videoName}</span>
              </div>
              {videoDescription && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">描述</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {videoDescription}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">分辨率</span>
                <span className="font-medium">{resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">帧率</span>
                <span className="font-medium">{frameRate} fps</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              点击创建按钮开始制作视频
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>
                {steps[currentStep].description}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              步骤 {currentStep + 1} / {steps.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${
                    index < steps.length - 1 ? "flex-1" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 ${
                        index < currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-[300px]">{renderStepContent()}</div>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={createMutation.isPending}
            >
              {currentStep === 0 ? "取消" : "上一步"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : currentStep === steps.length - 1 ? (
                "创建视频"
              ) : (
                <>
                  下一步
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
