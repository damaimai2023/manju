import { writeFile } from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

// 视频文件配置
export const VIDEO_CONFIG = {
  maxSize: 500 * 1024 * 1024, // 500MB
  allowedTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  allowedExtensions: [".mp4", ".webm", ".mov", ".avi"],
};

// 图片文件配置
export const IMAGE_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
};

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

/**
 * 确保上传目录存在
 */
export function ensureUploadDir(subDir: string = ""): string {
  const dir = path.join(UPLOAD_DIR, subDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}${ext}`;
}

/**
 * 验证文件类型
 */
export function validateFileType(
  file: File,
  config: { allowedTypes: string[]; allowedExtensions: string[] }
): boolean {
  const ext = path.extname(file.name).toLowerCase();
  return (
    config.allowedTypes.includes(file.type) ||
    config.allowedExtensions.includes(ext)
  );
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * 保存上传的文件
 */
export async function saveFile(
  file: File,
  subDir: string = ""
): Promise<{ url: string; filename: string; path: string }> {
  const dir = ensureUploadDir(subDir);
  const filename = generateUniqueFilename(file.name);
  const filepath = path.join(dir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  // 返回公开访问的URL
  const url = `/uploads/${subDir ? subDir + "/" : ""}${filename}`;

  return {
    url,
    filename,
    path: filepath,
  };
}

/**
 * 上传视频文件
 */
export async function uploadVideo(
  file: File
): Promise<{ url: string; filename: string; path: string }> {
  if (!validateFileType(file, VIDEO_CONFIG)) {
    throw new Error(
      `不支持的文件格式。支持的格式: ${VIDEO_CONFIG.allowedExtensions.join(", ")}`
    );
  }

  if (!validateFileSize(file, VIDEO_CONFIG.maxSize)) {
    throw new Error(
      `文件大小超过限制。最大允许: ${VIDEO_CONFIG.maxSize / 1024 / 1024}MB`
    );
  }

  return saveFile(file, "videos");
}

/**
 * 上传图片文件
 */
export async function uploadImage(
  file: File
): Promise<{ url: string; filename: string; path: string }> {
  if (!validateFileType(file, IMAGE_CONFIG)) {
    throw new Error(
      `不支持的文件格式。支持的格式: ${IMAGE_CONFIG.allowedExtensions.join(", ")}`
    );
  }

  if (!validateFileSize(file, IMAGE_CONFIG.maxSize)) {
    throw new Error(
      `文件大小超过限制。最大允许: ${IMAGE_CONFIG.maxSize / 1024 / 1024}MB`
    );
  }

  return saveFile(file, "images");
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * 检查是否为视频文件
 */
export function isVideoFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return VIDEO_CONFIG.allowedExtensions.includes(ext);
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return IMAGE_CONFIG.allowedExtensions.includes(ext);
}
