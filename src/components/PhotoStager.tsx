"use client";

import { type ChangeEvent } from "react";

export interface StagedPhoto {
  /** Local-only id (not a DB id) for React keys and removal. */
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PhotoStagerProps {
  staged: StagedPhoto[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  disabled?: boolean;
}

export function PhotoStager({
  staged,
  onAddFiles,
  onRemove,
  onCaptionChange,
  disabled,
}: PhotoStagerProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const picked = Array.from(input.files ?? []).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    if (picked.length > 0) onAddFiles(picked);
    // Reset so picking the same file again re-triggers onChange.
    input.value = "";
  };

  return (
    <div className="space-y-3">
      <label
        className={`inline-flex items-center px-4 py-2 bg-sage text-cream text-sm rounded-lg transition-colors ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-sage-light cursor-pointer"
        }`}
      >
        添加照片
        <input
          type="file"
          accept={ACCEPT}
          multiple
          data-testid="photo-stager-input"
          className="hidden"
          disabled={disabled}
          onChange={handleChange}
        />
      </label>

      {staged.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {staged.map((photo) => (
            <div key={photo.id} data-testid="staged-photo" className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="待上传照片"
                className="rounded-lg object-cover aspect-square w-full"
              />
              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                disabled={disabled}
                aria-label="移除照片"
                data-testid="staged-photo-remove"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-espresso/60 text-cream text-xs leading-none hover:bg-espresso transition-colors disabled:opacity-50"
              >
                ✕
              </button>
              <input
                type="text"
                value={photo.caption}
                onChange={(e) => onCaptionChange(photo.id, e.target.value)}
                placeholder="照片说明（选填）"
                data-testid="staged-photo-caption"
                disabled={disabled}
                className="mt-1 w-full px-2 py-1 text-xs border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
