"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface AiStats {
  totalCost: number;
  taskCount: number;
  byType: Record<string, number>;
}

export default function AiStudioPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchStats();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  };

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
    // 刷新统计数据
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
            {project?.name ? `项目: ${project.name}` : '使用AI加速你的漫剧创作'}
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
              <TabsTrigger value="characters" className="flex items-center gap-1">
                <Image className="h-4 w-4" />
                角色
              </TabsTrigger>
              <TabsTrigger value="scenes" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                场景
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                剧本
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-4">
              <AiGeneratorPanel
                projectId={projectId}
                onGenerated={handleGenerated}
              />
            </TabsContent>

            <TabsContent value="characters" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    AI角色生成
                  </CardTitle>
                  <CardDescription>
                    使用AI自动生成角色设计，包括三视图和一致性保持
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">智能生成角色</div>
                            <div className="text-sm text-muted-foreground">
                              根据描述自动创建完整角色
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Image className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">角色三视图</div>
                            <div className="text-sm text-muted-foreground">
                              为已有角色生成多角度视图
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scenes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    AI场景生成
                  </CardTitle>
                  <CardDescription>
                    自动生成场景背景和氛围图
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">场景概念图</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          根据描述生成场景概念设计
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">多视角场景</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          生成场景的多个角度视图
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="script" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    AI剧本助手
                  </CardTitle>
                  <CardDescription>
                    使用AI辅助创作剧本和分镜
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">生成剧本大纲</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          根据创意生成完整剧本结构
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">分镜脚本</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          将剧本转换为分镜描述
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">对白优化</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          优化角色对白，使其更自然
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardContent className="p-4">
                        <div className="font-medium">剧情分析</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          分析剧本结构和节奏
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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
              <TaskList projectId={projectId} limit={5} />
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
                <div className="space-y-2">
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
