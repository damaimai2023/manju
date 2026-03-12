"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mic, 
  Plus, 
  Search, 
  Play, 
  Pause, 
  MoreHorizontal,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Volume2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Voice {
  id: string;
  name: string;
  description: string | null;
  type: "STOCK" | "CLONED" | "CUSTOM";
  provider: string;
  providerVoiceId: string | null;
  cloneStatus: "NONE" | "PENDING" | "SUCCESS" | "FAILED";
  cloneTaskId: string | null;
  previewUrl: string | null;
  previewText: string | null;
  language: string;
  gender: string | null;
  style: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    characters: number;
  };
}

export default function VoicesPage() {
  const { toast } = useToast();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/voices");
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error("Failed to fetch voices:", error);
      toast({
        title: "加载失败",
        description: "无法加载音色列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (voice: Voice) => {
    if (!voice.previewUrl) {
      toast({
        title: "无预览",
        description: "该音色暂无预览音频",
      });
      return;
    }

    if (playingId === voice.id) {
      setPlayingId(null);
    } else {
      setPlayingId(voice.id);
      // 播放结束后重置
      setTimeout(() => setPlayingId(null), 5000);
    }
  };

  const handleDelete = async (voiceId: string) => {
    if (!confirm("确定要删除这个音色吗？")) return;

    try {
      const response = await fetch(`/api/voices/${voiceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "删除成功",
          description: "音色已删除",
        });
        fetchVoices();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除音色",
        variant: "destructive",
      });
    }
  };

  const handleRefreshCloneStatus = async (voice: Voice) => {
    if (!voice.cloneTaskId) return;

    try {
      const response = await fetch(`/api/voices/${voice.id}/clone`);
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "状态更新",
          description: `克隆状态: ${data.cloneStatus}`,
        });
        fetchVoices();
      }
    } catch (error) {
      toast({
        title: "刷新失败",
        description: "无法获取克隆状态",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STOCK: "系统预设",
      CLONED: "克隆音色",
      CUSTOM: "自定义",
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "STOCK":
        return "secondary";
      case "CLONED":
        return "default";
      case "CUSTOM":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getCloneStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredVoices = voices.filter((voice) => {
    const matchesSearch =
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (voice.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "stock" && voice.type === "STOCK") ||
      (activeTab === "cloned" && voice.type === "CLONED") ||
      (activeTab === "custom" && voice.type === "CUSTOM");

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">音色库</h1>
          <p className="text-muted-foreground">
            管理语音合成音色，支持系统预设和自定义克隆
          </p>
        </div>
        <Link href="/dashboard/voices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            添加音色
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索音色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="stock">系统预设</TabsTrigger>
          <TabsTrigger value="cloned">克隆音色</TabsTrigger>
          <TabsTrigger value="custom">自定义</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredVoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无音色</p>
                <Link href="/dashboard/voices/new" className="mt-4">
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一个音色
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVoices.map((voice) => (
                <Card key={voice.id} className="group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Volume2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{voice.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getTypeBadgeVariant(voice.type)}>
                              {getTypeLabel(voice.type)}
                            </Badge>
                            {voice.type === "CLONED" &&
                              getCloneStatusIcon(voice.cloneStatus)}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/voices/${voice.id}`}>
                              详情
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/voices/${voice.id}/edit`}>
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          {voice.type === "CLONED" && voice.cloneStatus === "PENDING" && (
                            <DropdownMenuItem onClick={() => handleRefreshCloneStatus(voice)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              刷新状态
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(voice.id)}
                          >
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {voice.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {voice.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {voice.gender && (
                          <span>{voice.gender === "male" ? "男" : "女"}</span>
                        )}
                        {voice.style && <span>· {voice.style}</span>}
                        {voice._count.characters > 0 && (
                          <span>· 用于{voice._count.characters}个角色</span>
                        )}
                      </div>
                      {voice.previewUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePlay(voice)}
                        >
                          {playingId === voice.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Hidden audio element for preview */}
      {playingId && (
        <audio
          src={voices.find((v) => v.id === playingId)?.previewUrl || ""}
          autoPlay
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />
      )}
    </div>
  );
}
