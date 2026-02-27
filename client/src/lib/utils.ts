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
  "I": "1st Year Semester 1",
  "II": "1st Year Semester 2",
  "III": "2nd Year Semester 1",
  "IV": "2nd Year Semester 2",
  "V": "3rd Year Semester 1",
  "VI": "3rd Year Semester 2",
  "VII": "4th Year Semester 1",
  "VIII": "4th Year Semester 2",
};

export function formatSemester(sem: string | undefined | null): string {
  if (!sem) return "Unknown";
  // Normalise — accept both "I" and "Sem I" or "Semester I"
  const cleaned = sem.trim().toUpperCase().replace(/^(SEM(ESTER)?\s*)/i, "");
  return SEMESTER_LABELS[cleaned] ?? sem;
}
