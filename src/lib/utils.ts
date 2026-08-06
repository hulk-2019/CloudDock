import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 合并 class：clsx 做条件拼接，tailwind-merge 做冲突去重。禁止手动拼接 class 字符串。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
