"use client";

import { useState, type ChangeEvent } from "react";
import type { Bean, UpdateBeanInput } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";
import { FlavorTagPicker } from "@/components/FlavorTagPicker";

interface BeanFormProps {
  /** Existing bean to prefill (edit mode); omit for a blank create form. */
  initial?: Bean;
  submitLabel: string;
  /** Show the single-photo picker (inline create only). */
  showPhotoPicker?: boolean;
  /** Prefix for field data-testids so multiple instances stay addressable. */
  testIdPrefix?: string;
  /** Persist the bean. Throw an Error (its message is shown) to signal failure. */
  onSubmit: (payload: UpdateBeanInput, photoFile: File | null) => Promise<void>;
  onCancel?: () => void;
}

const inputClass =
  "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";

function splitTags(value: string | null | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? []
  );
}

export function BeanForm({
  initial,
  submitLabel,
  showPhotoPicker = false,
  testIdPrefix = "new-bean",
  onSubmit,
  onCancel,
}: BeanFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [origin, setOrigin] = useState(initial?.origin_country ?? "");
  const [region, setRegion] = useState(initial?.origin_region ?? "");
  const [farm, setFarm] = useState(initial?.farm ?? "");
  const [roaster, setRoaster] = useState(initial?.roaster ?? "");
  const [processing, setProcessing] = useState(
    initial?.processing_method ?? "Washed"
  );
  const [roastLevel, setRoastLevel] = useState(initial?.roast_level ?? "Medium");
  const [tags, setTags] = useState<string[]>(
    splitTags(initial?.tasting_notes_tags)
  );
  const [freetext, setFreetext] = useState(
    initial?.tasting_notes_freetext ?? ""
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(e.target.files?.[0] ?? null);
  };

  const handleSave = async () => {
    if (!name.trim() || !origin.trim()) {
      setError("豆名和产地国家为必填项");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          origin_country: origin.trim(),
          origin_region: region.trim() || null,
          farm: farm.trim() || null,
          roaster: roaster.trim() || null,
          processing_method: processing,
          roast_level: roastLevel,
          tasting_notes_tags: tags.join(",") || null,
          tasting_notes_freetext: freetext.trim() || null,
        },
        photoFile
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-cream-dark rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-espresso">
        {initial ? "编辑咖啡豆" : "新增咖啡豆"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="豆名 *"
          data-testid={`${testIdPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产地国家 *"
          data-testid={`${testIdPrefix}-origin`}
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产区（选填）"
          data-testid={`${testIdPrefix}-region`}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="庄园（选填）"
          data-testid={`${testIdPrefix}-farm`}
          value={farm}
          onChange={(e) => setFarm(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="烘焙商（选填）"
          data-testid={`${testIdPrefix}-roaster`}
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
          className={inputClass}
        />
        <select
          data-testid={`${testIdPrefix}-processing`}
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
          data-testid={`${testIdPrefix}-roast`}
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
      <div>
        <p className="text-xs text-warm-gray/70 mb-2">风味描述（选填）</p>
        <textarea
          placeholder="这支豆喝起来怎么样？"
          data-testid={`${testIdPrefix}-freetext`}
          value={freetext}
          onChange={(e) => setFreetext(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      {showPhotoPicker && (
        <div>
          <p className="text-xs text-warm-gray/70 mb-2">照片（选填）</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center px-4 py-2 bg-cream-dark text-warm-gray text-sm rounded-lg cursor-pointer hover:bg-cream-dark/80 transition-colors">
              选择照片
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-testid={`${testIdPrefix}-photo-input`}
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            {photoFile && (
              <span className="flex items-center gap-2 text-xs text-warm-gray">
                <span
                  data-testid={`${testIdPrefix}-photo-name`}
                  className="max-w-40 truncate"
                >
                  {photoFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPhotoFile(null)}
                  className="text-red-600 hover:underline"
                >
                  移除
                </button>
              </span>
            )}
          </div>
        </div>
      )}
      {error && (
        <div
          data-testid={`${testIdPrefix}-error`}
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
          data-testid={`${testIdPrefix}-save`}
          className="px-4 py-2 bg-sage text-cream text-sm rounded-lg hover:bg-sage-light transition-colors disabled:opacity-50"
        >
          {saving ? "保存中…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            data-testid={`${testIdPrefix}-cancel`}
            className="px-4 py-2 bg-cream-dark text-warm-gray text-sm rounded-lg"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}
