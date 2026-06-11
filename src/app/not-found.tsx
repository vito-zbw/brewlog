import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="bg-white rounded-2xl shadow-sm border border-cream-dark p-10 max-w-md w-full text-center">
        <span className="text-5xl">&#9749;</span>
        <h1 className="mt-4 text-2xl font-bold text-espresso font-[Playfair_Display]">
          页面不存在
        </h1>
        <p className="mt-2 text-sm text-warm-gray">
          你要找的页面不在这里，可能已被移动或删除。
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
