import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 智能合并 Tailwind 类名的核心工具函数
 * 后传入的类名可以完美覆盖前面的默认类名，不产生冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
