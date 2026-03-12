/**
 * AI Service 主入口
 * 导出所有AI相关功能
 */

// 类型
export * from './types';

// Provider基类和工厂
export * from './base-provider';

// Provider实现
export * from './providers';

// Router
export {
  generateImage,
  generateText,
  generateAudio,
  estimateCost,
  getAvailableModels,
  getActiveProviders,
  selectModel,
  initializeAiProviders,
  clearProviderCache,
} from './router';

// 便捷函数
export * from './utils';

// 初始化
import { initializeAiProviders } from './router';

// 自动初始化（生产环境建议手动控制）
if (process.env.AUTO_INIT_AI_PROVIDERS === 'true') {
  initializeAiProviders().catch(console.error);
}
