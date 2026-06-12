import type { Photo } from "@/types";
import { PhotoDeleteButton } from "./PhotoDeleteButton";

interface PhotoGalleryProps {
  photos: Photo[];
  /** Show the per-photo delete button (signed-in visitors only). */
  canDelete?: boolean;
}

export function PhotoGallery({ photos, canDelete = false }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div
      data-testid="photo-gallery"
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
    >
      {photos.map((photo) => (
        <div key={photo.id} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.caption ?? "照片"}
            data-testid="gallery-image"
            className="rounded-lg object-cover aspect-square w-full"
          />
          {canDelete && <PhotoDeleteButton photoId={photo.id} />}
          {photo.caption && (
            <p className="mt-1 text-xs text-warm-gray truncate">
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
