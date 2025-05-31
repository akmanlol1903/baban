import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function cn(...classes: (string | boolean | undefined | null | { [key: string]: boolean })[]): string {
  return classes
    .filter(Boolean)
    .map((className) => {
      if (typeof className === 'object') {
        return Object.entries(className)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(' ');
      }
      return className;
    })
    .join(' ');
}