import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "TBD";
  return value.toString();
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(dateString: string): { text: string; isRecent: boolean } {
  const ms = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);

  if (mins < 5) return { text: "Just now", isRecent: true };
  if (mins < 60) return { text: `${mins}m ago`, isRecent: true };
  if (hours <= 2) return { text: `${hours}h ago`, isRecent: true };
  if (hours <= 6) return { text: `${hours}h ago`, isRecent: false };
  if (hours < 24) return { text: `${hours}h ago`, isRecent: false };
  if (days === 1) return { text: "Yesterday", isRecent: false };
  return { text: `${days}d ago`, isRecent: false };
}
