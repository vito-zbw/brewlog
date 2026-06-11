"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-10 max-w-md w-full text-center">
        <span className="text-5xl">&#9749;</span>
        <h1 className="mt-4 text-2xl font-bold text-espresso font-[Playfair_Display]">
          出错了
        </h1>
        <p className="mt-2 text-sm text-warm-gray">
          页面加载时出现问题，请重试。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-block px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          重试
        </button>
      </div>
    </div>
  );
}
