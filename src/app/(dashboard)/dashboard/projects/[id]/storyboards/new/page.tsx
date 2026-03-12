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

export default function NewStoryboardPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "请输入分镜名称",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/storyboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const storyboard = await response.json();
        toast({ title: "分镜创建成功" });
        router.push(`/dashboard/projects/${projectId}/storyboards/${storyboard.id}`);
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
        <Link href={`/dashboard/projects/${projectId}/storyboards`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建分镜</h1>
          <p className="text-muted-foreground">创建一个新的分镜</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>分镜信息</CardTitle>
          <CardDescription>填写分镜的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                分镜名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入分镜名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">分镜描述</Label>
              <Textarea
                id="description"
                placeholder="描述这个分镜的内容..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/projects/${projectId}/storyboards`}>
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
                  "创建分镜"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}