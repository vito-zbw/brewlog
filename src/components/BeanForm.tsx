"use client";

import { useEffect, useRef, useState } from "react";
import type { Bean, Photo, UpdateBeanInput } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";
import { FlavorTagPicker } from "@/components/FlavorTagPicker";
import { PhotoStager, type StagedPhoto } from "@/components/PhotoStager";
import { uploadEntityPhoto } from "@/lib/image-client";

interface BeanFormProps {
  /** Existing bean to prefill (edit mode); omit for a blank create form. */
  initial?: Bean;
  /** Existing photos to show with delete (edit contexts). */
  initialPhotos?: Photo[];
  submitLabel: string;
  /** Render the photo section (existing gallery + stager). */
  showPhotos?: boolean;
  /** Current user id — gates delete on existing photos. */
  currentUserId?: number | null;
  /** Prefix for field/photo data-testids so multiple instances stay addressable. */
  testIdPrefix?: string;
  /** Save the bean's fields and return the saved bean. Throw to show an error. */
  onSubmit: (payload: UpdateBeanInput) => Promise<Bean>;
  /** Called after fields are saved AND all staged photos uploaded. */
  onComplete: (bean: Bean) => void;
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
  initialPhotos,
  submitLabel,
  showPhotos = false,
  currentUserId = null,
  testIdPrefix = "new-bean",
  onSubmit,
  onComplete,
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

  // Seeded once from the prop, then managed locally (deletes update this state).
  // Every caller mounts a fresh form per target — the edit page renders anew and
  // the inline editor keys BeanForm by bean id — so there is no stale-prop risk.
  // A sync-from-prop effect would be WRONG here: it would resurrect a
  // just-deleted photo on the parent's next render.
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(
    initialPhotos ?? []
  );
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  // Set once the bean row exists, so a photo-upload retry never re-creates it.
  const [createdBean, setCreatedBean] = useState<Bean | null>(null);
  const stagedIdRef = useRef(0);
  const stagedRef = useRef<StagedPhoto[]>([]);
  stagedRef.current = stagedPhotos;

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Free any outstanding object URLs when the form unmounts.
  useEffect(() => {
    return () => {
      for (const p of stagedRef.current) URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  const handleAddFiles = (files: File[]) => {
    setStagedPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `staged-${stagedIdRef.current++}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      })),
    ]);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setStagedPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const handleDeleteExisting = async (photoId: number) => {
    if (!window.confirm("确定删除这张照片吗？此操作不可撤销。")) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(json?.error ?? "删除照片失败");
        return;
      }
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("删除照片失败");
    }
  };

  // Uploads every staged photo to the given bean; succeeded ones leave the
  // staging list (and free their preview). Returns how many failed.
  const uploadStagedPhotos = async (beanId: number): Promise<number> => {
    let failed = 0;
    for (const photo of stagedPhotos) {
      try {
        await uploadEntityPhoto("bean", beanId, photo.file, photo.caption);
        URL.revokeObjectURL(photo.previewUrl);
        setStagedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      } catch {
        failed++;
      }
    }
    return failed;
  };

  const handleSave = async () => {
    if (!name.trim() || !origin.trim()) {
      setError("豆名和产地国家为必填项");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: UpdateBeanInput = {
        name: name.trim(),
        origin_country: origin.trim(),
        origin_region: region.trim() || null,
        farm: farm.trim() || null,
        roaster: roaster.trim() || null,
        processing_method: processing,
        roast_level: roastLevel,
        tasting_notes_tags: tags.join(",") || null,
        tasting_notes_freetext: freetext.trim() || null,
      };
      // Create mode: skip the duplicate INSERT on a photo-upload retry. Edit
      // mode always re-saves fields (PUT is idempotent).
      let bean: Bean;
      if (initial == null && createdBean != null) {
        bean = createdBean;
      } else {
        bean = await onSubmit(payload);
        if (initial == null) setCreatedBean(bean);
      }
      const failed = await uploadStagedPhotos(bean.id);
      if (failed > 0) {
        setError(`咖啡豆已保存，但有 ${failed} 张照片上传失败，请重试。`);
        return;
      }
      onComplete(bean);
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
          aria-label="豆名"
          data-testid={`${testIdPrefix}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产地国家 *"
          aria-label="产地国家"
          data-testid={`${testIdPrefix}-origin`}
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="产区（选填）"
          aria-label="产区"
          data-testid={`${testIdPrefix}-region`}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="庄园（选填）"
          aria-label="庄园"
          data-testid={`${testIdPrefix}-farm`}
          value={farm}
          onChange={(e) => setFarm(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="烘焙商（选填）"
          aria-label="烘焙商"
          data-testid={`${testIdPrefix}-roaster`}
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
          className={inputClass}
        />
        <select
          data-testid={`${testIdPrefix}-processing`}
          aria-label="处理法"
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
          aria-label="烘焙度"
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
          aria-label="风味描述"
          data-testid={`${testIdPrefix}-freetext`}
          value={freetext}
          onChange={(e) => setFreetext(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      {showPhotos && (
        <div>
          <p className="text-xs text-warm-gray/70 mb-2">照片（选填）</p>
          {existingPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {existingPhotos.map((photo) => (
                <div
                  key={photo.id}
                  data-testid={`${testIdPrefix}-existing-photo`}
                  className="relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "照片"}
                    className="rounded-lg object-cover aspect-square w-full"
                  />
                  {currentUserId != null &&
                    currentUserId === photo.user_id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteExisting(photo.id)}
                        aria-label="删除照片"
                        data-testid={`${testIdPrefix}-existing-photo-delete`}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-espresso/60 text-cream text-xs leading-none hover:bg-espresso transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  {photo.caption && (
                    <p className="mt-1 text-xs text-warm-gray truncate">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <PhotoStager
            staged={stagedPhotos}
            onAddFiles={handleAddFiles}
            onRemove={handleRemoveStaged}
            onCaptionChange={handleCaptionChange}
            disabled={saving}
            testIdPrefix={testIdPrefix}
          />
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
