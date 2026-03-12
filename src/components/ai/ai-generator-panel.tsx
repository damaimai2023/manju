"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Wand2, Image, FileText, Music, Video, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  pricing: {
    input?: number;
    output?: number;
    image?: number;
  };
  isDefault?: boolean;
}

interface AiGeneratorPanelProps {
  projectId?: string;
  onGenerated?: (result: any) => void;
  defaultType?: "image" | "text" | "audio" | "video";
}

export function AiGeneratorPanel({ 
  projectId, 
  onGenerated,
  defaultType = "image" 
}: AiGeneratorPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultType);
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // 图像生成参数
  const [imagePrompt, setImagePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("standard");
  const [style, setStyle] = useState("");

  // 文本生成参数
  const [textPrompt, setTextPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(1000);
  const [temperature, setTemperature] = useState(0.7);

  // 加载模型列表
  useEffect(() => {
    fetchModels();
  }, [activeTab]);

  // 更新选中模型
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find(m => m.isDefault) || models[0];
      setSelectedModel(defaultModel.id);
      updateEstimatedCost(defaultModel);
    }
  }, [models]);

  const fetchModels = async () => {
    try {
      const response = await fetch(`/api/ai/models?type=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  };

  const updateEstimatedCost = (model: Model) => {
    if (activeTab === "image" && model.pricing.image) {
      setEstimatedCost(model.pricing.image);
    } else if ((activeTab === "text" || activeTab === "audio") && model.pricing.input && model.pricing.output) {
      // 估算文本成本
      const estimatedTokens = maxTokens;
      const cost = (model.pricing.input / 1000 * (estimatedTokens * 0.3)) + 
                   (model.pricing.output / 1000 * (estimatedTokens * 0.7));
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(0);
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      updateEstimatedCost(model);
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast({
        title: "请选择模型",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      let body: any = {
        type: activeTab,
        model: selectedModel,
        projectId,
      };

      if (activeTab === "image") {
        if (!imagePrompt.trim()) {
          toast({
            title: "请输入提示词",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        body = {
          ...body,
          prompt: imagePrompt,
          negativePrompt,
          aspectRatio,
          quality,
          style: style || undefined,
        };
      } else if (activeTab === "text") {
        if (!textPrompt.trim()) {
          toast({
            title: "请输入提示词",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        body = {
          ...body,
          prompt: textPrompt,
          systemPrompt: systemPrompt || undefined,
          maxTokens,
          temperature,
        };
      }

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "生成成功",
          description: `任务ID: ${data.taskId}`,
        });
        onGenerated?.(data);
      } else {
        toast({
          title: "生成失败",
          description: data.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "请求失败",
        description: "网络错误或服务器异常",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "$0.001";
    return `$${cost.toFixed(3)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI创作助手
        </CardTitle>
        <CardDescription>
          使用AI生成图像、文本、音频等内容
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="image" className="flex items-center gap-1">
              <Image className="h-4 w-4" />
              图像
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              文本
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              音频
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              视频
            </TabsTrigger>
          </TabsList>

          {/* 图像生成 */}
          <TabsContent value="image" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-prompt">画面描述</Label>
              <Textarea
                id="image-prompt"
                placeholder="描述你想要生成的图像..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="negative-prompt">负面提示词（可选）</Label>
              <Input
                id="negative-prompt"
                placeholder="不希望在图像中出现的内容..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>宽高比</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1 方形</SelectItem>
                    <SelectItem value="16:9">16:9 宽屏</SelectItem>
                    <SelectItem value="9:16">9:16 竖屏</SelectItem>
                    <SelectItem value="4:3">4:3 标准</SelectItem>
                    <SelectItem value="3:4">3:4 肖像</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>画质</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">标准</SelectItem>
                    <SelectItem value="hd">高清</SelectItem>
                    <SelectItem value="ultra">超高清</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">风格（可选）</Label>
              <Input
                id="style"
                placeholder="如: anime, realistic, watercolor..."
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* 文本生成 */}
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">系统提示词（可选）</Label>
              <Input
                id="system-prompt"
                placeholder="设定AI的角色和行为方式..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-prompt">用户提示词</Label>
              <Textarea
                id="text-prompt"
                placeholder="输入你想要AI完成的任务..."
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>最大Token数: {maxTokens}</Label>
              </div>
              <Slider
                value={[maxTokens]}
                onValueChange={(v) => setMaxTokens(v[0])}
                min={100}
                max={4000}
                step={100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>创造性 (Temperature): {temperature}</Label>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(v) => setTemperature(v[0])}
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </TabsContent>

          {/* 音频生成 */}
          <TabsContent value="audio" className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-700">
                音频合成功能即将上线，敬请期待
              </p>
            </div>
          </TabsContent>

          {/* 视频生成 */}
          <TabsContent value="video" className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-700">
                视频合成功能即将上线，敬请期待
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* 模型选择 */}
        <div className="space-y-2">
          <Label>选择模型</Label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择AI模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {model.provider}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 成本估算 */}
        {estimatedCost > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">预估成本</span>
            <Badge variant="secondary">{formatCost(estimatedCost)}</Badge>
          </div>
        )}

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (activeTab !== "image" && activeTab !== "text")}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              开始生成
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
