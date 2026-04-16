export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-5 w-48 bg-[#161b22] rounded" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[#161b22] rounded-md" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[80px]" />
        ))}
      </div>
    </div>
  );
}
