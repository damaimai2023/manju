"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  ArrowLeft, 
  Upload, 
  Play, 
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRESET_VOICES = [
  { id: "longxiaochun", name: "龙小春", gender: "female", style: "活泼", description: "年轻女声，适合动漫角色" },
  { id: "longxiaoxia", name: "龙小夏", gender: "female", style: "温柔", description: "温柔女声，适合知性角色" },
  { id: "longxiaocheng", name: "龙小诚", gender: "male", style: "稳重", description: "成熟男声，适合主角" },
  { id: "longxiaobai", name: "龙小白", gender: "female", style: "清纯", description: "清纯女声，适合少女角色" },
  { id: "longxiaowu", name: "龙小武", gender: "male", style: "武侠风", description: "武侠风格男声" },
  { id: "longshubai", name: "龙叔白", gender: "male", style: "成熟", description: "中年男声，适合长辈角色" },
];

export default function NewVoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("preset");
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  
  // 表单状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [cloneText, setCloneText] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "文件类型错误",
        description: "请上传音频文件",
        variant: "destructive",
      });
      return;
    }

    // 验证文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "音频文件不能超过10MB",
        variant: "destructive",
      });
      return;
    }

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleCreatePresetVoice = async () => {
    if (!selectedPreset) {
      toast({
        title: "请选择音色",
        description: "请选择一个系统预设音色",
      });
      return;
    }

    const preset = PRESET_VOICES.find((v) => v.id === selectedPreset);
    if (!preset) return;

    setLoading(true);
    try {
      const response = await fetch("/api/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || preset.name,
          description: description || preset.description,
          type: "STOCK",
          provider: "aliyun",
          providerVoiceId: preset.id,
          language: "zh",
          gender: preset.gender,
          style: preset.style,
        }),
      });

      if (response.ok) {
        toast({
          title: "创建成功",
          description: "音色已添加到您的音色库",
        });
        router.push("/dashboard/voices");
      } else {
        throw new Error("Create failed");
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "无法创建音色",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCloneVoice = async () => {
    if (!name) {
      toast({
        title: "请输入名称",
        description: "请为克隆音色设置名称",
      });
      return;
    }

    if (!audioFile && !audioUrl) {
      toast({
        title: "请上传音频",
        description: "需要音频样本进行克隆",
      });
      return;
    }

    setCloning(true);
    try {
      // 1. 先上传音频文件（这里简化处理，实际需要上传到存储服务）
      let uploadedUrl = audioUrl;
      if (audioFile) {
        // 实际项目中应该上传到云存储
        // 这里使用本地URL作为演示
        uploadedUrl = audioUrl;
      }

      // 2. 创建音色记录
      const createResponse = await fetch("/api/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          type: "CLONED",
          provider: "aliyun",
          cloneAudioUrl: uploadedUrl,
          cloneText: cloneText,
          language: "zh",
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Create voice failed");
      }

      const { voice } = await createResponse.json();

      // 3. 启动克隆任务
      const cloneResponse = await fetch(`/api/voices/${voice.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: uploadedUrl,
          text: cloneText,
        }),
      });

      if (cloneResponse.ok) {
        toast({
          title: "克隆任务已启动",
          description: "音色克隆需要几分钟时间，请稍后查看状态",
        });
        router.push("/dashboard/voices");
      } else {
        throw new Error("Clone task failed");
      }
    } catch (error) {
      toast({
        title: "克隆失败",
        description: "无法启动音色克隆任务",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/voices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">添加音色</h1>
          <p className="text-muted-foreground">选择系统预设或克隆自定义音色</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preset">
            <Sparkles className="mr-2 h-4 w-4" />
            系统预设
          </TabsTrigger>
          <TabsTrigger value="clone">
            <Mic className="mr-2 h-4 w-4" />
            克隆音色
          </TabsTrigger>
        </TabsList>

        {/* 系统预设 */}
        <TabsContent value="preset" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>为预设音色设置名称和描述</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">名称（可选）</Label>
                <Input
                  id="preset-name"
                  placeholder="留空将使用预设名称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preset-description">描述（可选）</Label>
                <Textarea
                  id="preset-description"
                  placeholder="留空将使用预设描述"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>选择音色</CardTitle>
              <CardDescription>选择系统预设的AI音色</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {PRESET_VOICES.map((voice) => (
                  <div
                    key={voice.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedPreset === voice.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPreset(voice.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mic className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{voice.name}</span>
                          {selectedPreset === voice.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {voice.gender === "male" ? "男" : voice.gender === "female" ? "女" : "未知"}
                          </Badge>
                          <span>{voice.style}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {voice.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleCreatePresetVoice}
              disabled={!selectedPreset || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "添加到音色库"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* 克隆音色 */}
        <TabsContent value="clone" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>音色信息</CardTitle>
              <CardDescription>为克隆的音色设置基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clone-name">名称 *</Label>
                <Input
                  id="clone-name"
                  placeholder="例如：主角声音"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clone-description">描述</Label>
                <Textarea
                  id="clone-description"
                  placeholder="描述这个音色的特点..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>上传音频样本</CardTitle>
              <CardDescription>
                上传清晰的音频样本用于音色克隆，建议 10-30 秒，wav 格式最佳
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {audioFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>已选择: {audioFile.name}</span>
                    </div>
                    <audio src={audioUrl} controls className="w-full" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioUrl("");
                      }}
                    >
                      重新选择
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAudioUpload}
                    />
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        点击上传音频文件
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 mp3, wav, m4a 格式，最大 10MB
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clone-text">参考文本（可选）</Label>
                <Textarea
                  id="clone-text"
                  placeholder="音频中说话的文本内容，有助于提高克隆质量..."
                  value={cloneText}
                  onChange={(e) => setCloneText(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  提供音频中的文本内容可以帮助AI更准确地克隆音色
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleCreateCloneVoice}
              disabled={!name || (!audioFile && !audioUrl) || cloning}
            >
              {cloning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  克隆中...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  开始克隆
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
