"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Play, 
  Pause, 
  CheckCircle,
  Volume2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Voice {
  id: string;
  name: string;
  description: string | null;
  type: "STOCK" | "CLONED" | "CUSTOM";
  providerVoiceId: string | null;
  cloneStatus: "NONE" | "PENDING" | "SUCCESS" | "FAILED";
  previewUrl: string | null;
  gender: string | null;
  style: string | null;
}

interface VoiceSelectorProps {
  value?: string;
  onChange: (voiceId: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ value, onChange, disabled }: VoiceSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchVoices();
    }
  }, [open]);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/voices?type=STOCK,CUSTOM");
      if (response.ok) {
        const data = await response.json();
        // 过滤出可用的音色（预设或克隆成功的）
        const availableVoices = (data.voices || []).filter(
          (v: Voice) => v.type !== "CLONED" || v.cloneStatus === "SUCCESS"
        );
        setVoices(availableVoices);
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

  const handlePlay = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
      setTimeout(() => setPlayingId(null), 5000);
    }
  };

  const handleSelect = (voiceId: string) => {
    onChange(voiceId);
    setOpen(false);
  };

  const selectedVoice = voices.find((v) => v.id === value);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STOCK: "预设",
      CLONED: "克隆",
      CUSTOM: "自定义",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start"
          disabled={disabled}
        >
          {selectedVoice ? (
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span>{selectedVoice.name}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {getTypeLabel(selectedVoice.type)}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mic className="h-4 w-4" />
              <span>选择音色</span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择音色</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : voices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mic className="h-8 w-8 mx-auto mb-2" />
            <p>暂无可用音色</p>
            <p className="text-sm">请先前往音色库添加音色</p>
          </div>
        ) : (
          <div className="h-[400px] overflow-y-auto pr-4">
            <div className="space-y-2">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => handleSelect(voice.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    value === voice.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Volume2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{voice.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(voice.type)}
                        </Badge>
                        {value === voice.id && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                      {(voice.gender || voice.style) && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {voice.gender && (
                            <span>{voice.gender === "male" ? "男" : voice.gender === "female" ? "女" : "未知"}</span>
                          )}
                          {voice.style && <span>· {voice.style}</span>}
                        </div>
                      )}
                      {voice.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {voice.description}
                        </p>
                      )}
                    </div>
                    {voice.previewUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => handlePlay(voice, e)}
                      >
                        {playingId === voice.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
      
      {playingId && (
        <audio
          src={voices.find((v) => v.id === playingId)?.previewUrl || ""}
          autoPlay
          onEnded={() => setPlayingId(null)}
          className="hidden"
        />
      )}
    </Dialog>
  );
}
