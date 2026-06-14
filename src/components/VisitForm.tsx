"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bean, Cafe } from "@/types";
import { BREW_METHODS } from "@/lib/terms";
import { RatingInput } from "@/components/RatingInput";
import { NewBeanForm } from "@/components/NewBeanForm";
import { VisitDeleteButton } from "@/components/VisitDeleteButton";

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

const NEW_CAFE_FIELDS = [
  { key: "city", placeholder: "城市", testId: "log-new-cafe-city", type: "text" },
  { key: "country", placeholder: "国家", testId: "log-new-cafe-country", type: "text" },
  { key: "lat", placeholder: "纬度", testId: "log-new-cafe-lat", type: "number" },
  { key: "lng", placeholder: "经度", testId: "log-new-cafe-lng", type: "number" },
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
}

export function VisitForm({ initial }: VisitFormProps) {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

  const handleBeanCreated = (bean: Bean) => {
    setBeans((prev) => [bean, ...prev]);
    setSelectedBeanIds((prev) => [...prev, bean.id]);
    setShowNewBean(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      let finalCafeId = cafeId ? Number(cafeId) : null;
      if (isNewCafe) {
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
      const json = (await res.json()) as { error?: string };
      if (!res.ok || json.error) {
        setFormError(json.error ?? "保存失败，请重试");
        return;
      }
      router.push(initial ? `/visits/${initial.id}` : "/visits");
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
            <input type="text" placeholder="店名" data-testid="log-new-cafe-name" value={newCafe.name}
              onChange={(e) => setNewCafe((p) => ({ ...p, name: e.target.value }))} className={inputClass} required />
            <div className="grid grid-cols-2 gap-3">
              {NEW_CAFE_FIELDS.map((f) => (
                <input key={f.key} type={f.type} step={f.type === "number" ? "any" : undefined}
                  placeholder={f.placeholder} data-testid={f.testId} value={newCafe[f.key]}
                  onChange={(e) => setNewCafe((p) => ({ ...p, [f.key]: e.target.value }))} className={inputClass} required />
              ))}
            </div>
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
          {beans.map((bean) => (
            <button key={bean.id} type="button" data-testid="log-bean-chip" onClick={() => toggleBean(bean.id)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                selectedBeanIds.includes(bean.id) ? "bg-sage text-cream" : "bg-cream-dark text-warm-gray hover:bg-cream-dark/80"
              }`}>
              {bean.name}
            </button>
          ))}
        </div>
        {!showNewBean ? (
          <button type="button" data-testid="log-add-new-bean" onClick={() => setShowNewBean(true)} className="text-sm text-terracotta hover:underline">
            + 添加新豆
          </button>
        ) : (
          <NewBeanForm onCreated={handleBeanCreated} onCancel={() => setShowNewBean(false)} />
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
