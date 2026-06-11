"use client";

interface RatingInputProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  testId: string;
}

export function RatingInput({ label, value, onChange, testId }: RatingInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso mb-1">
        {label}
      </label>
      <div className="flex gap-1" data-testid={testId}>
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
