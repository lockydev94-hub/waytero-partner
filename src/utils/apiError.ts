// ============================================================
// WAYTERO PARTNER — API ERROR MESSAGE EXTRACTOR
// Doc Ref: Backend app/main.py exception handlers
//
// See admin-portal's identical module for the full comment. Mirrored
// here so partner-portal pages don't need to reach across apps.
// ============================================================

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

function formatValidationItem(item: ValidationItem): string {
  const path = (item.loc ?? [])
    .filter((p) => p !== "body" && p !== "query" && p !== "path")
    .join(".");
  const msg = item.msg ?? "is invalid";
  return path ? `${path}: ${msg}` : msg;
}

export function apiErrorMessage(error: any, fallback = "Something went wrong"): string {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;

  if (typeof data.message === "string" && data.message.trim()) return data.message;

  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length) {
    return detail.map(formatValidationItem).join("; ");
  }

  return fallback;
}

export default apiErrorMessage;
