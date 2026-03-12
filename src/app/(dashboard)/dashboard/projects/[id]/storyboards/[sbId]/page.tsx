"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Save,
  Film,
  Grid3X3,
  List,
  Trash2,
  Edit3,
  Play,
  Wand2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShotSizeLabels, CameraAngleLabels, CameraMoveLabels } from "@/types";
import type { Storyboard, Shot, Character, Scene } from "@/types";

export default function StoryboardEditorPage() {
  const params = useParams();
  const projectId = params.id as string;
  const sbId = params.sbId as string;
  const { toast } = useToast();
  
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [formData, setFormData] = useState<Partial<Shot>>({});

  useEffect(() => {
    fetchData();
  }, [sbId]);

  const fetchData = async () => {
    try {
      const [storyboardRes, charactersRes, scenesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/storyboards/${sbId}`),
        fetch(`/api/projects/${projectId}/characters`),
        fetch(`/api/projects/${projectId}/scenes`),
      ]);

      if (storyboardRes.ok) {
        const sbData = await storyboardRes.json();
        setStoryboard(sbData);
        setShots(sbData.shots || []);
      }

      if (charactersRes.ok) {
        const charData = await charactersRes.json();
        setCharacters(charData.map((c: any) => ({
          ...c,
          appearance: c.appearance ? JSON.parse(c.appearance) : null,
        })));
      }

      if (scenesRes.ok) {
        const sceneData = await scenesRes.json();
        setScenes(sceneData);
      }
    } catch (error) {
      toast({
        title: "获取数据失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShot = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/storyboards/${sbId}/shots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shotSize: "MEDIUM",
          cameraAngle: "EYE_LEVEL",
          cameraMove: "STATIC",
        }),
      });

      if (response.ok) {
        const newShot = await response.json();
        setShots([...shots, newShot]);
        setSelectedShot(newShot);
        setFormData(newShot);
        toast({ title: "镜头已添加" });
      }
    } catch (error) {
      toast({
        title: "添加失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const handleUpdateShot = async () => {
    if (!selectedShot) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/storyboards/${sbId}/shots/${selectedShot.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setShots(shots.map(s => s.id === selectedShot.id ? { ...s, ...formData } : s));
        setSelectedShot({ ...selectedShot, ...formData });
        toast({ title: "保存成功" });
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

  const handleDeleteShot = async (shotId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/storyboards/${sbId}/shots/${shotId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setShots(shots.filter(s => s.id !== shotId));
        if (selectedShot?.id === shotId) {
          setSelectedShot(null);
          setFormData({});
        }
        toast({ title: "镜头已删除" });
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const selectShot = (shot: Shot) => {
    setSelectedShot(shot);
    setFormData(shot);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/projects/${projectId}/storyboards`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {storyboard?.name || "分镜编辑"}
            </h1>
            <p className="text-muted-foreground">
              {shots.length} 个镜头
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Play className="mr-2 h-4 w-4" />
            预览
          </Button>
          <Button size="sm" onClick={handleAddShot}>
            <Plus className="mr-2 h-4 w-4" />
            添加镜头
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel - Shot List */}
        <div className="lg:col-span-2 space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="mr-2 h-4 w-4" />
                网格
              </Button>
              <Button
                variant={viewMode === "timeline" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                <List className="mr-2 h-4 w-4" />
                时间线
              </Button>
            </div>
          </div>

          {/* Shots */}
          {shots.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Film className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">还没有镜头</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  添加您的第一个镜头
                </p>
                <Button className="mt-4" onClick={handleAddShot}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加镜头
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shots.map((shot, index) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  index={index}
                  isSelected={selectedShot?.id === shot.id}
                  onSelect={() => selectShot(shot)}
                  onDelete={() => handleDeleteShot(shot.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {shots.map((shot, index) => (
                <ShotListItem
                  key={shot.id}
                  shot={shot}
                  index={index}
                  isSelected={selectedShot?.id === shot.id}
                  onSelect={() => selectShot(shot)}
                  onDelete={() => handleDeleteShot(shot.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Editor */}
        <div>
          {selectedShot ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>镜头 #{selectedShot.shotNo}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const prev = shots.find(s => s.shotNo === selectedShot.shotNo - 1);
                        if (prev) selectShot(prev);
                      }}
                      disabled={selectedShot.shotNo === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const next = shots.find(s => s.shotNo === selectedShot.shotNo + 1);
                        if (next) selectShot(next);
                      }}
                      disabled={selectedShot.shotNo === shots.length}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shot Size */}
                <div className="space-y-2">
                  <Label>景别</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(ShotSizeLabels).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={formData.shotSize === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, shotSize: value as any })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Camera Angle */}
                <div className="space-y-2">
                  <Label>机位</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CameraAngleLabels).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={formData.cameraAngle === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, cameraAngle: value as any })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Camera Move */}
                <div className="space-y-2">
                  <Label>镜头运动</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CameraMoveLabels).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={formData.cameraMove === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, cameraMove: value as any })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Character */}
                <div className="space-y-2">
                  <Label>角色</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.characterId || ""}
                    onChange={(e) => setFormData({ ...formData, characterId: e.target.value || null })}
                  >
                    <option value="">无角色</option>
                    {characters.map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scene */}
                <div className="space-y-2">
                  <Label>场景</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={formData.sceneId || ""}
                    onChange={(e) => setFormData({ ...formData, sceneId: e.target.value || null })}
                  >
                    <option value="">无场景</option>
                    {scenes.map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {scene.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>画面描述</Label>
                  <Textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述画面内容..."
                    rows={3}
                  />
                </div>

                {/* Dialogue */}
                <div className="space-y-2">
                  <Label>台词</Label>
                  <Textarea
                    value={formData.dialogue || ""}
                    onChange={(e) => setFormData({ ...formData, dialogue: e.target.value })}
                    placeholder="输入角色台词..."
                    rows={2}
                  />
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <Label>动作</Label>
                  <Input
                    value={formData.action || ""}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    placeholder="描述角色动作..."
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label>时长（秒）</Label>
                  <Input
                    type="number"
                    value={formData.duration || ""}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
                    placeholder="秒"
                  />
                </div>

                {/* Save & Generate */}
                <div className="flex space-x-2 pt-4">
                  <Button 
                    className="flex-1" 
                    onClick={handleUpdateShot}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    保存
                  </Button>
                  <Button variant="outline">
                    <Wand2 className="mr-2 h-4 w-4" />
                    生成
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Edit3 className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">选择镜头</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  点击左侧镜头进行编辑
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Shot Card Component
function ShotCard({
  shot,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  shot: Shot;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
      }`}
    >
      {/* Shot Number */}
      <div className="absolute left-2 top-2 z-10">
        <Badge variant="secondary">#{shot.shotNo}</Badge>
      </div>
      
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {/* Preview */}
      <div className="aspect-video bg-muted">
        {shot.generatedImage ? (
          <img
            src={shot.generatedImage}
            alt={`Shot ${shot.shotNo}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <Film className="h-8 w-8 text-muted-foreground/50" />
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="block">{ShotSizeLabels[shot.shotSize]}</span>
              <span className="block">{CameraAngleLabels[shot.cameraAngle]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {shot.description || "无描述"}
        </p>
        {shot.character && (
          <Badge variant="outline" className="mt-2 text-xs">
            {shot.character.name}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Shot List Item Component
function ShotListItem({
  shot,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  shot: Shot;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex cursor-pointer items-center space-x-4 rounded-lg border p-4 transition-all ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <Badge variant="secondary">#{shot.shotNo}</Badge>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">{ShotSizeLabels[shot.shotSize]}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-sm">{CameraAngleLabels[shot.cameraAngle]}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {shot.description || "无描述"}
        </p>
      </div>
      {shot.character && (
        <Badge variant="outline" className="text-xs">
          {shot.character.name}
        </Badge>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded p-1 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}