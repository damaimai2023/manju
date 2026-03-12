"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewProjectPage() {
  const router = useRouter();
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
        title: "请输入项目名称",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const project = await response.json();
        toast({ title: "项目创建成功" });
        router.push(`/dashboard/projects/${project.id}`);
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
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建项目</h1>
          <p className="text-muted-foreground">创建一个新的漫剧项目</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>填写项目的基本信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                项目名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入项目名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">项目描述</Label>
              <Textarea
                id="description"
                placeholder="描述一下这个项目的主题、风格等..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/projects">
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
                  "创建项目"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}