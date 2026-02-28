import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a semester code (Roman numerals I–VIII) to a human-readable label.
 * e.g. "I" → "1st Year Semester 1", "III" → "2nd Year Semester 1", etc.
 */
const SEMESTER_LABELS: Record<string, string> = {
  "I": "I - Sem I",
  "II": "I - Sem II",
  "III": "II - Sem I",
  "IV": "II - Sem II",
  "V": "III - Sem I",
  "VI": "III - Sem II",
  "VII": "IV - Sem I",
  "VIII": "IV - Sem II",
};

export function formatSemester(sem: string | undefined | null): string {
  if (!sem) return "Unknown";
  // Normalise — accept both "I" and "Sem I" or "Semester I"
  const cleaned = sem.trim().toUpperCase().replace(/^(SEM(ESTER)?\s*)/i, "");
  return SEMESTER_LABELS[cleaned] ?? sem;
}
