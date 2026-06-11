import Link from "next/link";
import type { VisitWithDetails } from "@/types";
import { BREW_METHODS, formatVisitDate, optionLabel } from "@/lib/terms";
import { RatingBeans } from "./RatingBeans";

interface VisitCardProps {
  visit: VisitWithDetails;
}

export function VisitCard({ visit }: VisitCardProps) {
  const formattedDate = formatVisitDate(visit.visit_date);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
      data-testid="visit-card"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-[Playfair_Display] font-semibold text-espresso text-lg">
            {visit.cafe_name}
          </h3>
          <p className="text-warm-gray text-sm">
            {visit.cafe_city} &middot; {formattedDate}
          </p>
        </div>
        <div className="text-right">
          <RatingBeans rating={visit.rating_overall} />
          <p className="text-xs text-warm-gray mt-1">
            {visit.visited_by} 记录
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-espresso/10 text-espresso font-medium">
          {optionLabel(BREW_METHODS, visit.brew_method)}
        </span>
        {visit.beans.map((bean) => (
          <Link
            key={bean.id}
            href={`/beans/${bean.id}`}
            className="text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage font-medium hover:bg-sage/20 transition-colors"
          >
            {bean.name}
          </Link>
        ))}
      </div>

      {visit.notes && (
        <p className="text-sm text-warm-gray leading-relaxed line-clamp-2">
          {visit.notes}
        </p>
      )}
    </div>
  );
}
