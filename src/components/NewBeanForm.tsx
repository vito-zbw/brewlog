"use client";

import { useState } from "react";
import type { Bean } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";
import { FlavorTagPicker } from "@/components/FlavorTagPicker";

interface NewBeanFormProps {
  onCreated: (bean: Bean) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";

export function NewBeanForm({ onCreated, onCancel }: NewBeanFormProps) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [region, setRegion] = useState("");
  const [roaster, setRoaster] = useState("");
  const [processing, setProcessing] = useState("Washed");
  const [roastLevel, setRoastLevel] = useState("Medium");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !origin.trim()) {
      setError("豆名和产地国家为必填项");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/beans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          origin_country: origin,
          origin_region: region || null,
          roaster: roaster || null,
          processing_method: processing,
          roast_level: roastLevel,
          tasting_notes_tags: tags.join(",") || null,
        }),
      });
      const json = (await res.json()) as { data?: Bean; error?: string };
      if (json.error || !json.data) {
        setError(json.error ?? "保存失败，请重试");
        return;
      }
      onCreated(json.data);
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-cream-dark rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-espresso">新增咖啡豆</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="豆名 *"
          data-testid="new-bean-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产地国家 *"
          data-testid="new-bean-origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产区（选填）"
          data-testid="new-bean-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="烘焙商（选填）"
          data-testid="new-bean-roaster"
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
          className={inputClass}
        />
        <select
          data-testid="new-bean-processing"
          value={processing}
          onChange={(e) => setProcessing(e.target.value)}
          className={inputClass}
        >
          {PROCESSING_METHODS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          data-testid="new-bean-roast"
          value={roastLevel}
          onChange={(e) => setRoastLevel(e.target.value)}
          className={inputClass}
        >
          {ROAST_LEVELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs text-warm-gray/70 mb-2">风味标签</p>
        <FlavorTagPicker value={tags} onChange={setTags} />
      </div>
      {error && (
        <div
          data-testid="new-bean-error"
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          data-testid="new-bean-save"
          className="px-4 py-2 bg-sage text-cream text-sm rounded-lg hover:bg-sage-light transition-colors disabled:opacity-50"
        >
          保存豆子
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-cream-dark text-warm-gray text-sm rounded-lg"
        >
          取消
        </button>
      </div>
    </div>
  );
}
