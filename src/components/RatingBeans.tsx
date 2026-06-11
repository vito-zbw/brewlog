interface RatingBeansProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function RatingBeans({ rating, max = 5, size = "md" }: RatingBeansProps) {
  return (
    <span className={`inline-flex gap-0.5 ${sizeClasses[size]}`} aria-label={`${rating} / ${max} 分`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < rating ? "text-terracotta" : "text-warm-gray/30"}
        >
          &#9752;
        </span>
      ))}
    </span>
  );
}
