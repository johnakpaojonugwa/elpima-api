import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 5);

/**
 * Generate human-friendly quote reference (e.g., ELP-202610-K82W)
 */
export function generateQuoteReference() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomSuffix = nanoid();

  return `ELP-${year}${month}-${randomSuffix}`;
}
