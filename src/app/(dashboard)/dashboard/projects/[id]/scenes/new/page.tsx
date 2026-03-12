"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewScenePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    timeOfDay: "",
    atmosphere: "",
    style: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "请输入场景名称",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const scene = await response.json();
        toast({ title: "场景创建成功" });
        router.push(`/dashboard/projects/${projectId}/scenes/${scene.id}`);
      } else {
        const error = await response.json();
        toast({
          title: "创建失败",
          description: error.error || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/projects/${projectId}/scenes`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建场景</h1>
          <p className="text-muted-foreground">创建一个新的场景</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>场景信息</CardTitle>
          <CardDescription>填写场景的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                场景名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入场景名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="timeOfDay">时间</Label>
                <Input
                  id="timeOfDay"
                  placeholder="如：早晨、夜晚"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="atmosphere">氛围</Label>
                <Input
                  id="atmosphere"
                  placeholder="如：明亮、神秘"
                  value={formData.atmosphere}
                  onChange={(e) => setFormData({ ...formData, atmosphere: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="style">风格</Label>
                <Input
                  id="style"
                  placeholder="如：写实、动漫"
                  value={formData.style}
                  onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">场景描述</Label>
              <Textarea
                id="description"
                placeholder="描述这个场景的特点..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/projects/${projectId}/scenes`}>
                <Button type="button" variant="outline">
                  取消
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建场景"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}