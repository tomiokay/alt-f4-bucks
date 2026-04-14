export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Featured card skeleton */}
      <div className="rounded-xl bg-[#161b22] h-[340px]" />
      {/* Market grid skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[160px]" />
        ))}
      </div>
    </div>
  );
}
