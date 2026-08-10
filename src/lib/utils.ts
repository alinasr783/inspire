import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEgyptToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })
}
