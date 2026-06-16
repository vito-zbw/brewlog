"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bean, Cafe, Photo, UpdateBeanInput } from "@/types";
import { BREW_METHODS } from "@/lib/terms";
import { RatingInput } from "@/components/RatingInput";
import { BeanForm } from "@/components/BeanForm";
import { VisitDeleteButton } from "@/components/VisitDeleteButton";
import { LocationPicker } from "@/components/LocationPicker";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PhotoStager, type StagedPhoto } from "@/components/PhotoStager";
import { uploadEntityPhoto } from "@/lib/image-client";
import type { LatLng } from "@/lib/geo";

const inputClass =
  "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";
const cardClass = "bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6";
const headingClass = "text-lg font-[Playfair_Display] font-semibold text-espresso mb-4";
const labelClass = "block text-sm font-medium text-espresso mb-1";

const RATING_FIELDS = [
  { key: "overall", label: "总体评分", testId: "rating-overall" },
  { key: "beanQuality", label: "豆子品质", testId: "rating-bean-quality" },
  { key: "baristaSkill", label: "咖啡师水准", testId: "rating-barista-skill" },
  { key: "ambiance", label: "环境氛围", testId: "rating-ambiance" },
] as const;

// City/country are auto-filled by the location picker (search/GPS) but stay
// editable — geocoders sometimes mislabel Chinese localities. Latitude and
// longitude are no longer typed; the LocationPicker captures them.
const NEW_CAFE_FIELDS = [
  { key: "city", placeholder: "城市", testId: "log-new-cafe-city", type: "text" },
  { key: "country", placeholder: "国家", testId: "log-new-cafe-country", type: "text" },
] as const;

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface VisitFormProps {
  /** Present → edit mode (PUT + delete button); absent → create mode (POST). */
  initial?: {
    id: number;
    cafe_id: number;
    visit_date: string;
    brew_method: string;
    bean_ids: number[];
    rating_overall: number;
    rating_bean_quality: number;
    rating_barista_skill: number;
    rating_ambiance: number;
    notes: string;
  };
  /** Logged-in user id; enables inline edit/delete on beans they own. */
  currentUserId?: number | null;
  /** Existing photos for the visit (edit mode only); shown above the picker. */
  initialPhotos?: Photo[];
}

export function VisitForm({
  initial,
  currentUserId = null,
  initialPhotos,
}: VisitFormProps) {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingBeanId, setEditingBeanId] = useState<number | null>(null);
  const [editingBeanPhotos, setEditingBeanPhotos] = useState<Photo[]>([]);
  const [beanActionError, setBeanActionError] = useState("");

  const [cafeId, setCafeId] = useState(initial ? String(initial.cafe_id) : "");
  const [isNewCafe, setIsNewCafe] = useState(false);
  const [newCafe, setNewCafe] = useState({ name: "", city: "", country: "", lat: "", lng: "" });
  const [visitDate, setVisitDate] = useState(initial?.visit_date ?? todayLocal());
  const [brewMethod, setBrewMethod] = useState(initial?.brew_method ?? "V60");
  const [selectedBeanIds, setSelectedBeanIds] = useState<number[]>(initial?.bean_ids ?? []);
  const [ratings, setRatings] = useState(
    initial
      ? {
          overall: initial.rating_overall,
          beanQuality: initial.rating_bean_quality,
          baristaSkill: initial.rating_barista_skill,
          ambiance: initial.rating_ambiance,
        }
      : { overall: 3, beanQuality: 3, baristaSkill: 3, ambiance: 3 }
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showNewBean, setShowNewBean] = useState(false);

  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  // Set once the visit row exists, so a photo-upload retry never re-creates it.
  const [createdVisitId, setCreatedVisitId] = useState<number | null>(null);
  // Monotonic local id source for staged photos.
  const stagedIdRef = useRef(0);
  // Latest staged list, read by the unmount cleanup to revoke preview URLs.
  const stagedRef = useRef<StagedPhoto[]>([]);
  stagedRef.current = stagedPhotos;

  useEffect(() => {
    async function load() {
      try {
        const [cafesRes, beansRes] = await Promise.all([fetch("/api/cafes"), fetch("/api/beans")]);
        if (!cafesRes.ok || !beansRes.ok) {
          throw new Error("请求失败");
        }
        const cafesJson = (await cafesRes.json()) as { data?: Cafe[] };
        const beansJson = (await beansRes.json()) as { data?: Bean[] };
        setCafes(cafesJson.data ?? []);
        setBeans(beansJson.data ?? []);
      } catch {
        setFormError("数据加载失败，请刷新页面重试。");
      }
    }
    load();
  }, []);

  const toggleBean = (id: number) => {
    setSelectedBeanIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  // Inline create/edit: BeanForm owns the staged-photo upload + retry; these
  // just save the bean's fields and return the saved bean (mirrors how the
  // visit form itself stages photos and uploads after the row exists).
  const createBeanFields = async (payload: UpdateBeanInput): Promise<Bean> => {
    const res = await fetch("/api/beans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { data?: Bean; error?: string };
    if (!res.ok || !json.data) {
      throw new Error(json.error ?? "保存失败，请重试");
    }
    return json.data;
  };

  const onBeanCreated = (bean: Bean) => {
    setBeans((prev) => [bean, ...prev]);
    setSelectedBeanIds((prev) => [...prev, bean.id]);
    setShowNewBean(false);
  };

  const updateBeanFields = async (
    payload: UpdateBeanInput
  ): Promise<Bean> => {
    // editingBeanId is always set while the inline edit form is rendered.
    const res = await fetch(`/api/beans/${editingBeanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { data?: Bean; error?: string };
    if (!res.ok || !json.data) {
      throw new Error(json.error ?? "保存失败，请重试");
    }
    return json.data;
  };

  const onBeanUpdated = (bean: Bean) => {
    setBeans((prev) => prev.map((b) => (b.id === bean.id ? bean : b)));
    setEditingBeanId(null);
  };

  const handleBeanDelete = async (bean: Bean) => {
    if (
      !window.confirm(`确定删除咖啡豆「${bean.name}」吗？此操作不可撤销。`)
    ) {
      return;
    }
    setBeanActionError("");
    try {
      const res = await fetch(`/api/beans/${bean.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setBeanActionError(json.error ?? "删除失败，请重试");
        return;
      }
      setBeans((prev) => prev.filter((b) => b.id !== bean.id));
      setSelectedBeanIds((prev) => prev.filter((id) => id !== bean.id));
      if (editingBeanId === bean.id) setEditingBeanId(null);
    } catch {
      setBeanActionError("删除失败，请重试");
    }
  };

  const startBeanEdit = async (id: number) => {
    setShowNewBean(false);
    setBeanActionError("");
    // Load the bean's existing photos so the inline editor can manage them.
    // Fetched before opening so BeanForm mounts with them ready (it seeds its
    // existing-photo state from the prop on mount).
    let photos: Photo[] = [];
    try {
      const res = await fetch(
        `/api/photos?entity_type=bean&entity_id=${id}`
      );
      if (res.ok) photos = ((await res.json()) as { data?: Photo[] }).data ?? [];
    } catch {
      // Non-fatal — open the editor without the existing gallery.
    }
    setEditingBeanPhotos(photos);
    setEditingBeanId(id);
  };

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

  // Free any outstanding object URLs when the form unmounts.
  useEffect(() => {
    return () => {
      for (const p of stagedRef.current) URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  // Uploads every staged photo to the given visit. Succeeded ones leave the
  // staging list (and free their preview); returns how many failed.
  const uploadStagedPhotos = async (visitId: number): Promise<number> => {
    let failed = 0;
    for (const photo of stagedPhotos) {
      try {
        await uploadEntityPhoto("visit", visitId, photo.file, photo.caption);
        URL.revokeObjectURL(photo.previewUrl);
        setStagedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      } catch {
        failed++;
      }
    }
    return failed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      // On a photo-upload retry (create mode) the visit already exists — skip
      // re-creating café + visit. Edit mode always re-saves the visit fields.
      let targetVisitId = initial?.id ?? createdVisitId;

      if (targetVisitId == null || initial) {
        let finalCafeId = cafeId ? Number(cafeId) : null;
        if (isNewCafe) {
          if (!newCafe.lat || !newCafe.lng) {
            setFormError("请在地图上选择咖啡馆位置");
            return;
          }
          const cafeRes = await fetch("/api/cafes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newCafe.name,
              city: newCafe.city,
              country: newCafe.country,
              latitude: parseFloat(newCafe.lat),
              longitude: parseFloat(newCafe.lng),
            }),
          });
          const cafeJson = (await cafeRes.json()) as { data?: Cafe; error?: string };
          if (cafeJson.error || !cafeJson.data) {
            setFormError(cafeJson.error ?? "新增咖啡馆失败，请重试");
            return;
          }
          const createdCafe = cafeJson.data;
          finalCafeId = createdCafe.id;
          // 避免重试时重复创建咖啡馆：加入列表并切换为已有咖啡馆
          setCafes((prev) => [createdCafe, ...prev]);
          setCafeId(String(createdCafe.id));
          setIsNewCafe(false);
        }

        if (!finalCafeId) {
          setFormError("请选择或新增咖啡馆");
          return;
        }

        const res = await fetch(initial ? `/api/visits/${initial.id}` : "/api/visits", {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cafe_id: finalCafeId,
            visit_date: visitDate,
            brew_method: brewMethod,
            rating_overall: ratings.overall,
            rating_bean_quality: ratings.beanQuality,
            rating_barista_skill: ratings.baristaSkill,
            rating_ambiance: ratings.ambiance,
            notes: notes || null,
            bean_ids: selectedBeanIds,
          }),
        });
        const json = (await res.json()) as {
          data?: { id: number };
          error?: string;
        };
        if (!res.ok || json.error || !json.data) {
          setFormError(json.error ?? "保存失败，请重试");
          return;
        }
        targetVisitId = initial ? initial.id : json.data.id;
        // 避免重试时重复创建探店记录：记住已创建的 id
        if (!initial) setCreatedVisitId(targetVisitId);
      }

      // Upload staged photos to the now-existing visit.
      const failedCount = await uploadStagedPhotos(targetVisitId);
      if (failedCount > 0) {
        setFormError(
          `探店记录已保存，但有 ${failedCount} 张照片上传失败，请重试。`
        );
        return;
      }

      router.push(`/visits/${targetVisitId}`);
    } catch {
      setFormError("保存失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleClass = (active: boolean) =>
    `text-sm px-4 py-2 rounded-lg transition-colors ${active ? "bg-terracotta text-cream" : "bg-cream-dark text-warm-gray"}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={cardClass}>
        <h2 className={headingClass}>咖啡馆</h2>
        <div className="flex gap-4 mb-4">
          <button type="button" data-testid="log-cafe-existing-toggle" onClick={() => setIsNewCafe(false)} className={toggleClass(!isNewCafe)}>
            选择已有
          </button>
          <button type="button" data-testid="log-cafe-new-toggle" onClick={() => setIsNewCafe(true)} className={toggleClass(isNewCafe)}>
            新增咖啡馆
          </button>
        </div>
        {isNewCafe ? (
          <div className="space-y-3">
            <input type="text" placeholder="店名" aria-label="店名" data-testid="log-new-cafe-name" value={newCafe.name}
              onChange={(e) => setNewCafe((p) => ({ ...p, name: e.target.value }))} className={inputClass} required />
            <div className="grid grid-cols-2 gap-3">
              {NEW_CAFE_FIELDS.map((f) => (
                <input key={f.key} type={f.type}
                  placeholder={f.placeholder} aria-label={f.placeholder} data-testid={f.testId} value={newCafe[f.key]}
                  onChange={(e) => setNewCafe((p) => ({ ...p, [f.key]: e.target.value }))} className={inputClass} required />
              ))}
            </div>
            <LocationPicker
              value={
                newCafe.lat && newCafe.lng
                  ? { latitude: parseFloat(newCafe.lat), longitude: parseFloat(newCafe.lng) }
                  : null
              }
              onChange={(p: LatLng) =>
                setNewCafe((prev) => ({ ...prev, lat: String(p.latitude), lng: String(p.longitude) }))
              }
              onResolved={({ city, country }) =>
                setNewCafe((prev) => ({
                  ...prev,
                  // Never clobber a value the user typed.
                  city: prev.city || city,
                  country: prev.country || country,
                }))
              }
            />
          </div>
        ) : (
          <select data-testid="log-cafe-select" value={cafeId} onChange={(e) => setCafeId(e.target.value)} className={inputClass}>
            <option value="">请选择咖啡馆…</option>
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}（{c.city}）</option>
            ))}
          </select>
        )}
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>探店信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>到访日期</label>
            <input type="date" data-testid="log-date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>冲煮方式</label>
            <select data-testid="log-brew-method" value={brewMethod} onChange={(e) => setBrewMethod(e.target.value)} className={inputClass} required>
              {BREW_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>品尝的咖啡豆</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {beans.map((bean) => {
            const selected = selectedBeanIds.includes(bean.id);
            const owned = currentUserId != null && bean.user_id === currentUserId;
            return (
              <span key={bean.id} className="inline-flex items-center gap-0.5">
                <button type="button" data-testid="log-bean-chip" onClick={() => toggleBean(bean.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    selected ? "bg-sage text-cream" : "bg-cream-dark text-warm-gray hover:bg-cream-dark/80"
                  }`}>
                  {bean.name}
                </button>
                {owned && (
                  <>
                    <button type="button" data-testid="log-bean-edit" title="编辑咖啡豆"
                      aria-label={`编辑 ${bean.name}`} onClick={() => startBeanEdit(bean.id)}
                      className="px-1 text-xs text-warm-gray/60 hover:text-espresso transition-colors">
                      ✎
                    </button>
                    <button type="button" data-testid="log-bean-delete" title="删除咖啡豆"
                      aria-label={`删除 ${bean.name}`} onClick={() => handleBeanDelete(bean)}
                      className="px-1 text-xs text-warm-gray/60 hover:text-red-600 transition-colors">
                      ✕
                    </button>
                  </>
                )}
              </span>
            );
          })}
        </div>
        {beanActionError && (
          <div data-testid="log-bean-action-error" className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {beanActionError}
          </div>
        )}
        {editingBeanId != null ? (
          <BeanForm
            key={editingBeanId}
            initial={beans.find((b) => b.id === editingBeanId)}
            initialPhotos={editingBeanPhotos}
            submitLabel="保存修改"
            showPhotos
            currentUserId={currentUserId}
            testIdPrefix="bean-edit"
            onSubmit={updateBeanFields}
            onComplete={onBeanUpdated}
            onCancel={() => setEditingBeanId(null)}
          />
        ) : !showNewBean ? (
          <button type="button" data-testid="log-add-new-bean" onClick={() => { setShowNewBean(true); setBeanActionError(""); }} className="text-sm text-terracotta hover:underline">
            + 添加新豆
          </button>
        ) : (
          <BeanForm
            submitLabel="保存豆子"
            showPhotos
            currentUserId={currentUserId}
            testIdPrefix="new-bean"
            onSubmit={createBeanFields}
            onComplete={onBeanCreated}
            onCancel={() => setShowNewBean(false)}
          />
        )}
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>评分</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {RATING_FIELDS.map((f) => (
            <RatingInput key={f.key} label={f.label} value={ratings[f.key]} testId={f.testId}
              onChange={(n) => setRatings((p) => ({ ...p, [f.key]: n }))} />
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <label className="block text-sm font-medium text-espresso mb-2">备注</label>
        <textarea data-testid="log-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="这次体验如何？有什么亮点？" rows={4} className={`${inputClass} resize-none`} />
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>照片</h2>
        {initial && initialPhotos && initialPhotos.length > 0 && (
          <div className="mb-4">
            <PhotoGallery photos={initialPhotos} currentUserId={currentUserId} />
          </div>
        )}
        <PhotoStager
          staged={stagedPhotos}
          onAddFiles={handleAddFiles}
          onRemove={handleRemoveStaged}
          onCaptionChange={handleCaptionChange}
          disabled={submitting}
        />
      </div>

      {formError && (
        <div data-testid="log-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {formError}
        </div>
      )}

      <button type="submit" data-testid="log-submit" disabled={submitting}
        className="w-full py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50">
        {submitting ? "保存中…" : "保存探店记录"}
      </button>

      {initial && (
        <div className="flex justify-end border-t border-cream-dark/50 pt-4">
          <VisitDeleteButton visitId={initial.id} />
        </div>
      )}
    </form>
  );
}
