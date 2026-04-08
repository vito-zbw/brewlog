"use client";

import { useState } from "react";

interface FlavorTagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

const COMMON_TAGS = [
  "blueberry", "strawberry", "citrus", "lemon", "orange", "grapefruit",
  "tropical fruit", "peach", "mango", "passionfruit", "lychee",
  "dark chocolate", "milk chocolate", "caramel", "toffee", "honey",
  "vanilla", "hazelnut", "almond", "peanut",
  "jasmine", "rose", "bergamot", "cinnamon",
  "wine", "champagne", "brown sugar", "molasses",
];

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
    const tag = customTag.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setCustomTag("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMMON_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
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
          placeholder="Add custom tag..."
          className="flex-1 px-3 py-1.5 text-sm border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        />
        <button
          type="button"
          onClick={addCustomTag}
          className="px-3 py-1.5 text-sm bg-cream-dark text-warm-gray rounded-lg hover:bg-cream-dark/80"
        >
          Add
        </button>
      </div>
    </div>
  );
}
