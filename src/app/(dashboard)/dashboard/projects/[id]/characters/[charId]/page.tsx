"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { VoiceSelector } from "@/components/voice/voice-selector";
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Upload,
  User,
  Palette,
  FileText,
  Sparkles,
  X,
  Mic
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Character, CharacterAppearance } from "@/types";

export default function CharacterDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const charId = params.charId as string;
  const { toast } = useToast();
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Character>>({});
  const [appearance, setAppearance] = useState<Partial<CharacterAppearance>>({});

  useEffect(() => {
    fetchCharacter();
  }, [charId]);

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${charId}`);
      if (response.ok) {
        const data = await response.json();
        setCharacter(data);
        setFormData(data);
        setAppearance(data.appearance || {});
      } else {
        toast({
          title: "获取角色失败",
          description: "角色不存在或无权访问",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "获取角色失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${charId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          appearance,
        }),
      });

      if (response.ok) {
        toast({ title: "保存成功" });
        fetchCharacter();
      } else {
        throw new Error("Save failed");
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (view: "frontView" | "sideView" | "backView", file: File) => {
    // In a real app, you would upload to a storage service
    // For now, we'll use a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({ ...prev, [view]: result }));
      toast({ title: `${view === "frontView" ? "正面" : view === "sideView" ? "侧面" : "背面"}图已上传` });
    };
    reader.readAsDataURL(file);
  };

  const updateAppearance = (path: string, value: any) => {
    setAppearance(prev => {
      const keys = path.split('.');
      const newAppearance = { ...prev };
      let current: any = newAppearance;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newAppearance;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <User className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">角色不存在</h3>
        <Link href={`/dashboard/projects/${projectId}/characters`} className="mt-4">
          <Button variant="outline">返回角色列表</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}/characters`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {formData.name || "未命名角色"}
            </h1>
            <p className="text-muted-foreground">编辑角色信息</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">
            <User className="mr-2 h-4 w-4" />
            基本信息
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Mic className="mr-2 h-4 w-4" />
            音色设定
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            外貌设定
          </TabsTrigger>
          <TabsTrigger value="views">
            <Upload className="mr-2 h-4 w-4" />
            三视图
          </TabsTrigger>
          <TabsTrigger value="story">
            <FileText className="mr-2 h-4 w-4" />
            背景故事
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">角色名称</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入角色名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">性别</Label>
                  <Input
                    id="gender"
                    value={formData.gender || ""}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    placeholder="男/女/其他"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="age">年龄</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
                  placeholder="输入角色年龄"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">角色简介</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述角色的特点、身份等..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>音色设定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice">角色音色</Label>
                <VoiceSelector
                  value={formData.voiceId}
                  onChange={(voiceId) => setFormData({ ...formData, voiceId })}
                />
                <p className="text-sm text-muted-foreground">
                  为角色选择合适的音色，用于语音合成和对话生成
                </p>
              </div>

              {formData.voiceId && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">音色提示</h4>
                  <p className="text-sm text-muted-foreground">
                    角色已绑定音色。在生成分镜对话时，可以使用该音色进行语音合成。
                    您可以在"音色库"页面管理所有音色。
                  </p>
                  <div className="mt-3">
                    <Link href="/dashboard/voices">
                      <Button variant="outline" size="sm">
                        <Mic className="mr-2 h-4 w-4" />
                        管理音色库
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>外貌特征</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hair */}
              <div className="space-y-4">
                <h3 className="font-semibold">发型</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>发色</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={appearance.hair?.color || "#000000"}
                        onChange={(e) => updateAppearance("hair.color", e.target.value)}
                        className="h-10 w-10 rounded border"
                      />
                      <Input
                        value={appearance.hair?.color || ""}
                        onChange={(e) => updateAppearance("hair.color", e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>发型</Label>
                    <Input
                      value={appearance.hair?.style || ""}
                      onChange={(e) => updateAppearance("hair.style", e.target.value)}
                      placeholder="如：中分、短发、长发"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>长度</Label>
                    <Input
                      value={appearance.hair?.length || ""}
                      onChange={(e) => updateAppearance("hair.length", e.target.value)}
                      placeholder="如：及肩、及腰"
                    />
                  </div>
                </div>
              </div>

              {/* Face */}
              <div className="space-y-4">
                <h3 className="font-semibold">面部</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>脸型</Label>
                    <Input
                      value={appearance.face?.shape || ""}
                      onChange={(e) => updateAppearance("face.shape", e.target.value)}
                      placeholder="如：瓜子脸、圆脸"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>眼睛形状</Label>
                    <Input
                      value={appearance.face?.eyes?.shape || ""}
                      onChange={(e) => updateAppearance("face.eyes.shape", e.target.value)}
                      placeholder="如：丹凤眼、杏眼"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>瞳色</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={appearance.face?.eyes?.color || "#000000"}
                        onChange={(e) => updateAppearance("face.eyes.color", e.target.value)}
                        className="h-10 w-10 rounded border"
                      />
                      <Input
                        value={appearance.face?.eyes?.color || ""}
                        onChange={(e) => updateAppearance("face.eyes.color", e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Clothing */}
              <div className="space-y-4">
                <h3 className="font-semibold">服装</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>上衣</Label>
                    <Input
                      value={appearance.clothing?.top || ""}
                      onChange={(e) => updateAppearance("clothing.top", e.target.value)}
                      placeholder="描述上衣样式"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>下装</Label>
                    <Input
                      value={appearance.clothing?.bottom || ""}
                      onChange={(e) => updateAppearance("clothing.bottom", e.target.value)}
                      placeholder="描述下装样式"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Views Tab - Three Views */}
        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>三视图</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {/* Front View */}
                <ViewUploadCard
                  title="正面"
                  image={formData.frontView}
                  onUpload={(file) => handleImageUpload("frontView", file)}
                  onClear={() => setFormData(prev => ({ ...prev, frontView: null }))}
                />
                
                {/* Side View */}
                <ViewUploadCard
                  title="侧面"
                  image={formData.sideView}
                  onUpload={(file) => handleImageUpload("sideView", file)}
                  onClear={() => setFormData(prev => ({ ...prev, sideView: null }))}
                />
                
                {/* Back View */}
                <ViewUploadCard
                  title="背面"
                  image={formData.backView}
                  onUpload={(file) => handleImageUpload("backView", file)}
                  onClear={() => setFormData(prev => ({ ...prev, backView: null }))}
                />
              </div>
              
              {/* AI Generation Hint */}
              <div className="mt-6 rounded-lg bg-muted p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">AI 提示</h4>
                    <p className="text-sm text-muted-foreground">
                      上传三视图可以保持角色在不同场景中的一致性。正面图用于标准视角生成，侧面图用于侧面角度，背面图用于背影场景。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Tab */}
        <TabsContent value="story" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>角色背景</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personality">性格特点</Label>
                <Textarea
                  id="personality"
                  value={formData.personality || ""}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="描述角色的性格、行为习惯等..."
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="background">背景故事</Label>
                <Textarea
                  id="background"
                  value={formData.background || ""}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                  placeholder="描述角色的成长经历、重要事件等..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// View Upload Card Component
function ViewUploadCard({
  title,
  image,
  onUpload,
  onClear,
}: {
  title: string;
  image?: string | null;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}视图</Label>
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted transition-colors hover:border-muted-foreground/50">
        {image ? (
          <>
            <img
              src={image}
              alt={`${title}视图`}
              className="h-full w-full object-cover"
            />
            <button
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <label className="flex h-full cursor-pointer flex-col items-center justify-center p-4 text-center">
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">点击上传</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
