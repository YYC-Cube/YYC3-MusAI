// YYC³ music-utils — className 合成工具（全仓唯一实现，music-ui / music-voice 经此复用）
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
