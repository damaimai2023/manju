"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Image,
  FileText,
  Music,
  Video
} from "lucide-react";

interface Task {
  id: string;
  type: string;
  status: string;
  model: string;
  prompt: string;
  progress?: number;
  resultUrl?: string;
  error?: string;
  cost: number;
  createdAt: string;
  completedAt?: string;
}

interface GenerationProgressProps {
  taskId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onComplete?: (task: Task) => void;
  onError?: (error: string) => void;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  PENDING: {
    label: "等待中",
    icon: <Clock className="h-4 w-4" />,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  QUEUED: {
    label: "队列中",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  PROCESSING: {
    label: "生成中",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
  },
  COMPLETED: {
    label: "已完成",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  FAILED: {
    label: "失败",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  CANCELLED: {
    label: "已取消",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  TIMEOUT: {
    label: "超时",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
};

const typeIcons: Record<string, React.ReactNode> = {
  CHARACTER_GENERATE: <Image className="h-4 w-4" />,
  CHARACTER_VIEW: <Image className="h-4 w-4" />,
  SCENE_GENERATE: <Image className="h-4 w-4" />,
  STORYBOARD_SHOT: <Image className="h-4 w-4" />,
  SCRIPT_GENERATE: <FileText className="h-4 w-4" />,
  DESCRIPTION_ENHANCE: <FileText className="h-4 w-4" />,
  AUDIO_TTS: <Music className="h-4 w-4" />,
  AUDIO_MUSIC: <Music className="h-4 w-4" />,
  VIDEO_GENERATE: <Video className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  CHARACTER_GENERATE: "角色生成",
  CHARACTER_VIEW: "角色视角",
  SCENE_GENERATE: "场景生成",
  STORYBOARD_SHOT: "分镜生成",
  SCRIPT_GENERATE: "剧本生成",
  DESCRIPTION_ENHANCE: "描述优化",
  AUDIO_TTS: "语音合成",
  AUDIO_MUSIC: "音乐生成",
  VIDEO_GENERATE: "视频生成",
};

export function GenerationProgress({
  taskId,
  autoRefresh = true,
  refreshInterval = 2000,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    // 立即获取一次
    fetchTask();

    // 设置自动刷新
    let interval: NodeJS.Timeout;
    if (autoRefresh && task?.status !== "COMPLETED" && task?.status !== "FAILED") {
      interval = setInterval(fetchTask, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId, autoRefresh]);

  // 监听状态变化
  useEffect(() => {
    if (task?.status === "COMPLETED") {
      onComplete?.(task);
    } else if (task?.status === "FAILED" && task.error) {
      onError?.(task.error);
    }
  }, [task?.status]);

  const fetchTask = async () => {
    if (!taskId || loading) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/ai/tasks/${taskId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTask(data.task);
      }
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[task.status] || statusConfig.PENDING;
  const progress = task.status === "COMPLETED" ? 100 : 
                   task.status === "PENDING" ? 0 : 
                   task.status === "PROCESSING" ? 50 : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* 状态头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <span className={config.color}>{config.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {typeIcons[task.type]}
                <span className="font-medium">
                  {typeLabels[task.type] || task.type}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {task.model}
              </div>
            </div>
          </div>
          <Badge variant={task.status === "COMPLETED" ? "default" : "secondary"}>
            {config.label}
          </Badge>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>生成进度</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* 提示词预览 */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">提示词</div>
          <p className="text-sm line-clamp-2">{task.prompt}</p>
        </div>

        {/* 结果展示 */}
        {task.status === "COMPLETED" && task.resultUrl && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">生成结果</div>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={task.resultUrl}
                alt="Generated content"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {task.status === "FAILED" && task.error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>生成失败: {task.error}</span>
            </div>
          </div>
        )}

        {/* 成本信息 */}
        {task.cost > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">成本</span>
            <span>${task.cost.toFixed(4)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 任务列表组件
 */
export function TaskList({ 
  projectId,
  limit = 10 
}: { 
  projectId?: string;
  limit?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    
    // 自动刷新
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const url = projectId 
        ? `/api/ai/tasks?projectId=${projectId}&limit=${limit}`
        : `/api/ai/tasks?limit=${limit}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无生成任务
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const config = statusConfig[task.status] || statusConfig.PENDING;
        
        return (
          <Card key={task.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${config.bgColor}`}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {typeLabels[task.type] || task.type}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {task.prompt}
                  </p>
                </div>
                {task.cost > 0 && (
                  <div className="text-xs text-muted-foreground">
                    ${task.cost.toFixed(3)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
