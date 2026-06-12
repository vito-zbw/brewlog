"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

// Legacy copy path for non-secure contexts where navigator.clipboard
// is unavailable (e.g. plain-HTTP LAN access from a phone).
function copyViaTextarea(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  // iOS Safari ignores a bare select() on a textarea.
  textarea.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

export function ShareLinkButton() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showStatus = (next: CopyStatus) => {
    setStatus(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  };

  const handleClick = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showStatus("copied");
        return;
      }
    } catch {
      // Clipboard API rejected — fall through to the textarea fallback.
    }
    showStatus(copyViaTextarea(url) ? "copied" : "failed");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="share-link-button"
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-warm-gray bg-white border border-cream-dark rounded-lg hover:bg-cream hover:text-espresso transition-colors whitespace-nowrap"
    >
      {status === "copied"
        ? "已复制"
        : status === "failed"
          ? "复制失败"
          : "🔗 复制链接"}
    </button>
  );
}
