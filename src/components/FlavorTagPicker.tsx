"use client";

import { useState } from "react";
import { TASTING_TAGS } from "@/lib/terms";

interface FlavorTagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function FlavorTagPicker({ value, onChange }: FlavorTagPickerProps) {
  const [customTag, setCustomTag] = useState("");

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setCustomTag("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TASTING_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            data-testid="flavor-tag"
            onClick={() => toggleTag(tag)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              value.includes(tag)
                ? "bg-terracotta text-cream"
                : "bg-cream-dark text-warm-gray hover:bg-cream-dark/80"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="添加自定义标签…"
          aria-label="添加自定义标签"
          data-testid="flavor-custom-input"
          className="flex-1 px-3 py-1.5 text-sm border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        />
        <button
          type="button"
          onClick={addCustomTag}
          data-testid="flavor-custom-add"
          className="px-3 py-1.5 text-sm bg-cream-dark text-warm-gray rounded-lg hover:bg-cream-dark/80"
        >
          添加
        </button>
      </div>
    </div>
  );
}
