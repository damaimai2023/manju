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

export default function NewCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    age: "",
    gender: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "请输入角色名称",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined,
        }),
      });

      if (response.ok) {
        const character = await response.json();
        toast({ title: "角色创建成功" });
        router.push(`/dashboard/projects/${projectId}/characters/${character.id}`);
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
        <Link href={`/dashboard/projects/${projectId}/characters`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新建角色</h1>
          <p className="text-muted-foreground">创建一个新的漫剧角色</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>角色信息</CardTitle>
          <CardDescription>填写角色的基本信息，详细设定可以在创建后编辑</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                角色名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="输入角色名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">年龄</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="输入年龄"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">性别</Label>
                <Input
                  id="gender"
                  placeholder="男/女/其他"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">角色简介</Label>
              <Textarea
                id="description"
                placeholder="简要描述角色的特点..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href={`/dashboard/projects/${projectId}/characters`}>
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
                  "创建角色"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}