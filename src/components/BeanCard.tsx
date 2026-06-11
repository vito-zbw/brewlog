import Link from "next/link";
import type { Bean } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS, optionLabel } from "@/lib/terms";

interface BeanCardProps {
  bean: Bean;
}

export function BeanCard({ bean }: BeanCardProps) {
  const tags = bean.tasting_notes_tags?.split(",").map((t) => t.trim()) ?? [];

  return (
    <Link href={`/beans/${bean.id}`} data-testid="bean-card">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-cream-dark/50 transition-all duration-200 p-5 h-full flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-[Playfair_Display] font-semibold text-espresso text-lg leading-tight">
            {bean.name}
          </h3>
        </div>
        <p className="text-warm-gray text-sm mb-1">
          {bean.origin_country}
          {bean.origin_region ? `, ${bean.origin_region}` : ""}
        </p>
        {bean.roaster && (
          <p className="text-warm-gray/70 text-xs mb-3">
            {bean.roaster} 烘焙
          </p>
        )}
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage font-medium">
            {optionLabel(PROCESSING_METHODS, bean.processing_method)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta font-medium">
            {optionLabel(ROAST_LEVELS, bean.roast_level)}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-auto">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-cream-dark text-warm-gray"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
