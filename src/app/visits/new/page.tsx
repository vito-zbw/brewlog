"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Bean, Cafe } from "@/types";
import { BREW_METHODS, TEAM_MEMBERS, PROCESSING_METHODS, ROAST_LEVELS } from "@/types";
import { FlavorTagPicker } from "@/components/FlavorTagPicker";

interface RatingInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

function RatingInput({ label, value, onChange }: RatingInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso mb-1">
        {label}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              n <= value
                ? "bg-terracotta text-cream"
                : "bg-cream-dark text-warm-gray hover:bg-cream-dark/80"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewVisitPage() {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Visit form state
  const [cafeId, setCafeId] = useState<string>("");
  const [isNewCafe, setIsNewCafe] = useState(false);
  const [newCafeName, setNewCafeName] = useState("");
  const [newCafeCity, setNewCafeCity] = useState("");
  const [newCafeCountry, setNewCafeCountry] = useState("");
  const [newCafeLat, setNewCafeLat] = useState("");
  const [newCafeLng, setNewCafeLng] = useState("");
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [brewMethod, setBrewMethod] = useState<string>("V60");
  const [selectedBeanIds, setSelectedBeanIds] = useState<number[]>([]);
  const [ratingOverall, setRatingOverall] = useState(3);
  const [ratingBeanQuality, setRatingBeanQuality] = useState(3);
  const [ratingBaristaSkill, setRatingBaristaSkill] = useState(3);
  const [ratingAmbiance, setRatingAmbiance] = useState(3);
  const [notes, setNotes] = useState("");
  const [visitedBy, setVisitedBy] = useState<string>(TEAM_MEMBERS[0]);

  // New bean inline form
  const [showNewBean, setShowNewBean] = useState(false);
  const [newBeanName, setNewBeanName] = useState("");
  const [newBeanOrigin, setNewBeanOrigin] = useState("");
  const [newBeanRegion, setNewBeanRegion] = useState("");
  const [newBeanRoaster, setNewBeanRoaster] = useState("");
  const [newBeanProcessing, setNewBeanProcessing] = useState("washed");
  const [newBeanRoastLevel, setNewBeanRoastLevel] = useState("medium");
  const [newBeanTags, setNewBeanTags] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [cafesRes, beansRes] = await Promise.all([
        fetch("/api/cafes"),
        fetch("/api/beans"),
      ]);
      const cafesJson = await cafesRes.json();
      const beansJson = await beansRes.json();
      setCafes(cafesJson.data);
      setBeans(beansJson.data);
    }
    load();
  }, []);

  const toggleBean = (id: number) => {
    setSelectedBeanIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const addNewBean = async () => {
    if (!newBeanName || !newBeanOrigin) return;

    const res = await fetch("/api/beans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newBeanName,
        origin_country: newBeanOrigin,
        origin_region: newBeanRegion || null,
        roaster: newBeanRoaster || null,
        processing_method: newBeanProcessing,
        roast_level: newBeanRoastLevel,
        tasting_notes_tags: newBeanTags.join(",") || null,
        created_by: visitedBy,
      }),
    });

    const json = await res.json();
    if (json.data) {
      setBeans((prev) => [json.data, ...prev]);
      setSelectedBeanIds((prev) => [...prev, json.data.id]);
      setShowNewBean(false);
      setNewBeanName("");
      setNewBeanOrigin("");
      setNewBeanRegion("");
      setNewBeanRoaster("");
      setNewBeanProcessing("washed");
      setNewBeanRoastLevel("medium");
      setNewBeanTags([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalCafeId = cafeId ? Number(cafeId) : null;

    if (isNewCafe) {
      const cafeRes = await fetch("/api/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCafeName,
          city: newCafeCity,
          country: newCafeCountry,
          latitude: parseFloat(newCafeLat),
          longitude: parseFloat(newCafeLng),
          created_by: visitedBy,
        }),
      });
      const cafeJson = await cafeRes.json();
      if (cafeJson.error) {
        alert(cafeJson.error);
        setSubmitting(false);
        return;
      }
      finalCafeId = cafeJson.data.id;
    }

    if (!finalCafeId) {
      alert("Please select or add a cafe");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cafe_id: finalCafeId,
        visited_by: visitedBy,
        visit_date: visitDate,
        brew_method: brewMethod,
        rating_overall: ratingOverall,
        rating_bean_quality: ratingBeanQuality,
        rating_barista_skill: ratingBaristaSkill,
        rating_ambiance: ratingAmbiance,
        notes: notes || null,
        bean_ids: selectedBeanIds,
      }),
    });

    const json = await res.json();
    if (json.error) {
      alert(json.error);
      setSubmitting(false);
      return;
    }

    router.push("/visits");
  };

  const inputClass =
    "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        Log a Visit
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Person */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <label className="block text-sm font-medium text-espresso mb-2">
            Your Name
          </label>
          <select
            value={visitedBy}
            onChange={(e) => setVisitedBy(e.target.value)}
            className={inputClass}
          >
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Cafe */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <h2 className="text-lg font-[Playfair_Display] font-semibold text-espresso mb-4">
            Cafe
          </h2>
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setIsNewCafe(false)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                !isNewCafe
                  ? "bg-terracotta text-cream"
                  : "bg-cream-dark text-warm-gray"
              }`}
            >
              Select Existing
            </button>
            <button
              type="button"
              onClick={() => setIsNewCafe(true)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${
                isNewCafe
                  ? "bg-terracotta text-cream"
                  : "bg-cream-dark text-warm-gray"
              }`}
            >
              Add New
            </button>
          </div>

          {isNewCafe ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Cafe name"
                value={newCafeName}
                onChange={(e) => setNewCafeName(e.target.value)}
                className={inputClass}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={newCafeCity}
                  onChange={(e) => setNewCafeCity(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={newCafeCountry}
                  onChange={(e) => setNewCafeCountry(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={newCafeLat}
                  onChange={(e) => setNewCafeLat(e.target.value)}
                  className={inputClass}
                  required
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newCafeLng}
                  onChange={(e) => setNewCafeLng(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          ) : (
            <select
              value={cafeId}
              onChange={(e) => setCafeId(e.target.value)}
              className={inputClass}
              required={!isNewCafe}
            >
              <option value="">Select a cafe...</option>
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Visit details */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <h2 className="text-lg font-[Playfair_Display] font-semibold text-espresso mb-4">
            Visit Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Visit Date
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Brew Method
              </label>
              <select
                value={brewMethod}
                onChange={(e) => setBrewMethod(e.target.value)}
                className={inputClass}
                required
              >
                {BREW_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Beans */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <h2 className="text-lg font-[Playfair_Display] font-semibold text-espresso mb-4">
            Beans Tried
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {beans.map((bean) => (
              <button
                key={bean.id}
                type="button"
                onClick={() => toggleBean(bean.id)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  selectedBeanIds.includes(bean.id)
                    ? "bg-sage text-cream"
                    : "bg-cream-dark text-warm-gray hover:bg-cream-dark/80"
                }`}
              >
                {bean.name}
              </button>
            ))}
          </div>

          {!showNewBean ? (
            <button
              type="button"
              onClick={() => setShowNewBean(true)}
              className="text-sm text-terracotta hover:underline"
            >
              + Add a new bean
            </button>
          ) : (
            <div className="border border-cream-dark rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-espresso">New Bean</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Bean name *"
                  value={newBeanName}
                  onChange={(e) => setNewBeanName(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Origin country *"
                  value={newBeanOrigin}
                  onChange={(e) => setNewBeanOrigin(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Region (optional)"
                  value={newBeanRegion}
                  onChange={(e) => setNewBeanRegion(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Roaster (optional)"
                  value={newBeanRoaster}
                  onChange={(e) => setNewBeanRoaster(e.target.value)}
                  className={inputClass}
                />
                <select
                  value={newBeanProcessing}
                  onChange={(e) => setNewBeanProcessing(e.target.value)}
                  className={inputClass}
                >
                  {PROCESSING_METHODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={newBeanRoastLevel}
                  onChange={(e) => setNewBeanRoastLevel(e.target.value)}
                  className={inputClass}
                >
                  {ROAST_LEVELS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-warm-gray/70 mb-2">Tasting Notes</p>
                <FlavorTagPicker
                  value={newBeanTags}
                  onChange={setNewBeanTags}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addNewBean}
                  className="px-4 py-2 bg-sage text-cream text-sm rounded-lg hover:bg-sage-light transition-colors"
                >
                  Save Bean
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBean(false)}
                  className="px-4 py-2 bg-cream-dark text-warm-gray text-sm rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ratings */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <h2 className="text-lg font-[Playfair_Display] font-semibold text-espresso mb-4">
            Ratings
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <RatingInput
              label="Overall"
              value={ratingOverall}
              onChange={setRatingOverall}
            />
            <RatingInput
              label="Bean Quality"
              value={ratingBeanQuality}
              onChange={setRatingBeanQuality}
            />
            <RatingInput
              label="Barista Skill"
              value={ratingBaristaSkill}
              onChange={setRatingBaristaSkill}
            />
            <RatingInput
              label="Ambiance"
              value={ratingAmbiance}
              onChange={setRatingAmbiance}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6">
          <label className="block text-sm font-medium text-espresso mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How was the experience? What stood out?"
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Log Visit"}
        </button>
      </form>
    </div>
  );
}
