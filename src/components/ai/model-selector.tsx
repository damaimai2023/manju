"use client";

import { useState, useEffect } from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Image, FileText, Music, Video } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  capabilities: string[];
  pricing: {
    input?: number;
    output?: number;
    image?: number;
  };
  isDefault?: boolean;
}

interface ModelSelectorProps {
  type?: "text" | "image" | "audio" | "video" | "multimodal";
  value?: string;
  onChange?: (modelId: string, model: Model) => void;
  placeholder?: string;
  showPricing?: boolean;
  className?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  TEXT: <FileText className="h-4 w-4" />,
  IMAGE: <Image className="h-4 w-4" />,
  AUDIO: <Music className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  MULTIMODAL: <Sparkles className="h-4 w-4" />,
};

export function ModelSelector({
  type,
  value,
  onChange,
  placeholder = "选择AI模型",
  showPricing = true,
  className,
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  useEffect(() => {
    loadModels();
  }, [type]);

  useEffect(() => {
    if (value && models.length > 0) {
      const model = models.find(m => m.id === value);
      if (model) {
        setSelectedModel(model);
      }
    }
  }, [value, models]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const url = type ? `/api/ai/models?type=${type}` : '/api/ai/models';
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      onChange?.(modelId, model);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "免费";
    if (price < 0.001) return "极低";
    return `$${price.toFixed(4)}`;
  };

  const getPricingInfo = (model: Model) => {
    if (model.pricing.image) {
      return `${formatPrice(model.pricing.image)}/张`;
    }
    if (model.pricing.input && model.pricing.output) {
      const avg = (model.pricing.input + model.pricing.output) / 2;
      return `${formatPrice(avg)}/1K tokens`;
    }
    return "-";
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={className}>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">加载中...</span>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {models.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            暂无可用模型
          </div>
        ) : (
          models.map((model) => (
            <SelectItem 
              key={model.id} 
              value={model.id}
              className="py-3"
            >
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {typeIcons[model.type]}
                    <span className="font-medium">{model.name}</span>
                    {model.isDefault && (
                      <Badge variant="secondary" className="text-xs">默认</Badge>
                    )}
                  </div>
                  {showPricing && (
                    <span className="text-xs text-muted-foreground">
                      {getPricingInfo(model)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{model.provider}</span>
                  {model.capabilities?.slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="outline" className="text-[10px]">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/**
 * 智能模型推荐
 */
export function SmartModelSelector({
  task,
  onChange,
}: {
  task: "speed" | "quality" | "cost" | "balanced";
  onChange?: (modelId: string) => void;
}) {
  const [recommendedModel, setRecommendedModel] = useState<string>("");

  useEffect(() => {
    // 根据任务类型推荐模型
    const recommendations: Record<string, string> = {
      speed: "gpt-4o-mini", // 快速响应
      quality: "claude-3-7-sonnet-20250219", // 高质量
      cost: "gpt-4o-mini", // 低成本
      balanced: "gpt-4o", // 平衡
    };
    setRecommendedModel(recommendations[task]);
    onChange?.(recommendations[task]);
  }, [task]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">智能推荐</span>
        <Badge variant="secondary">
          {task === "speed" && "速度优先"}
          {task === "quality" && "质量优先"}
          {task === "cost" && "成本优先"}
          {task === "balanced" && "平衡模式"}
        </Badge>
      </div>
      <ModelSelector
        type="text"
        value={recommendedModel}
        onChange={(_, model) => onChange?.(model.id)}
      />
    </div>
  );
}
