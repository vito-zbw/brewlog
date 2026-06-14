"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateUsername } from "@/lib/username-validation";

interface UsernameFormProps {
  userId: number;
  currentName: string;
}

export function UsernameForm({ userId, currentName }: UsernameFormProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const unchanged = trimmed === currentName.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    const message = validateUsername(name);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = (await res.json()) as {
        data?: { name: string };
        error?: string;
      };
      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "保存失败，请稍后重试");
        return;
      }
      setName(json.data.name);
      setSuccess("已保存");
      router.refresh();
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        id="settings-name"
        data-testid="settings-name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
          setSuccess("");
        }}
        className="w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
      />
      {error && (
        <p data-testid="settings-error" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p data-testid="settings-success" className="text-sm text-sage">
          {success}
        </p>
      )}
      <button
        type="submit"
        data-testid="settings-submit"
        disabled={saving || unchanged || trimmed.length === 0}
        className="px-4 py-2 bg-terracotta hover:bg-terracotta-light text-cream rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
