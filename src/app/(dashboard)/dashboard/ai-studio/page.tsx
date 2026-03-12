"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AiGeneratorPanel, 
  TaskList 
} from "@/components/ai";
import { 
  Sparkles, 
  Image, 
  FileText, 
  Music, 
  Video,
  History,
  Settings,
  Wand2,
  Loader2,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AiStats {
  totalCost: number;
  taskCount: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
}

export default function AiStudioPage() {
  const { toast } = useToast();
  
  const [stats, setStats] = useState<AiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/estimate?days=30`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalCost: data.totalCost,
          taskCount: data.totalRequests,
          byType: data.byOperation,
          byProvider: data.byProvider,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerated = (result: any) => {
    toast({
      title: "生成请求已提交",
      description: "任务已开始处理，请稍后查看结果",
    });
    fetchStats();
  };

  return (
    <div className="container py-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI创作室
          </h1>
          <p className="text-muted-foreground mt-1">
            使用AI加速你的漫剧创作全流程
          </p>
        </div>
        
        {/* 统计卡片 */}
        <div className="flex gap-4">
          <Card className="w-40">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">本月消耗</div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  `$${(stats?.totalCost || 0).toFixed(2)}`
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="w-40">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">生成任务</div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stats?.taskCount || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* 快速功能卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-purple-500 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Image className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">AI生图</div>
                <div className="text-xs text-muted-foreground">图像生成</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">AI编剧</div>
                <div className="text-xs text-muted-foreground">剧本生成</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Music className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">AI配音</div>
                <div className="text-xs text-muted-foreground">语音合成</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-orange-500 transition-colors group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <Video className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="font-medium">AI视频</div>
                <div className="text-xs text-muted-foreground">视频生成</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：生成面板 */}
        <div className="col-span-12 lg:col-span-7">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="generate" className="flex items-center gap-1">
                <Wand2 className="h-4 w-4" />
                AI生成
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                模型
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                模板
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                历史
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-4">
              <AiGeneratorPanel
                onGenerated={handleGenerated}
              />
            </TabsContent>

            <TabsContent value="models" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>可用模型</CardTitle>
                  <CardDescription>
                    系统支持的AI模型和提供商
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-xs">OP</span>
                          </div>
                          <div>
                            <div className="font-medium">OpenAI</div>
                            <div className="text-sm text-muted-foreground">GPT-4o, DALL-E 3</div>
                          </div>
                        </div>
                        <Badge>已配置</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 text-xs">SA</span>
                          </div>
                          <div>
                            <div className="font-medium">Stability AI</div>
                            <div className="text-sm text-muted-foreground">Stable Diffusion 3.5</div>
                          </div>
                        </div>
                        <Badge variant="outline">待配置</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 text-xs">AN</span>
                          </div>
                          <div>
                            <div className="font-medium">Anthropic</div>
                            <div className="text-sm text-muted-foreground">Claude 3.7 Sonnet</div>
                          </div>
                        </div>
                        <Badge variant="outline">待配置</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>提示词模板</CardTitle>
                  <CardDescription>
                    常用的AI生成提示词模板
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">角色设计模板</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          用于生成漫剧角色的标准提示词模板
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">场景背景模板</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          用于生成场景和背景的提示词模板
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">分镜描述模板</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          用于生成分镜画面的提示词模板
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>生成历史</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskList limit={10} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：任务历史和设置 */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* 最近任务 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                最近任务
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList limit={5} />
            </CardContent>
          </Card>

          {/* 使用统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                使用统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byType && Object.keys(stats.byType).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.byType).map(([type, cost]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Badge variant="secondary">${cost.toFixed(3)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无使用记录
                </p>
              )}
            </CardContent>
          </Card>

          {/* 支持的模型 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">支持的AI模型</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    图像生成
                  </span>
                  <Badge variant="outline">DALL-E 3, SD 3.5</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    文本生成
                  </span>
                  <Badge variant="outline">GPT-4o, Claude 3.7</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    语音合成
                  </span>
                  <Badge variant="outline">TTS-1</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快速提示 */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">创作提示</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    使用详细的描述可以获得更好的生成效果。包括角色外貌、服装、表情、场景氛围等细节。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
