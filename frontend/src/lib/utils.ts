import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeForVoice(timeStr: string): string {
  if (!timeStr) return '';
  
  // Handle HH:mm or H:mm formats
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  
  if (isNaN(h) || isNaN(m)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = m === 0 ? '' : ` ${m}`; // "eight thirty" sounds better than "eight colon thirty"
  
  let period = '';
  if (h >= 5 && h < 12) period = 'in the morning';
  else if (h >= 12 && h < 17) period = 'in the afternoon';
  else if (h >= 17 && h < 21) period = 'in the evening';
  else if (h >= 21 || h < 5) period = 'at night';

  return `${hour12}${minStr} ${ampm} ${period}`.trim();
}
