export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-9 rounded-lg bg-[#161b22] w-[280px]" />
      <div className="flex gap-6">
        <div className="h-5 rounded bg-[#161b22] w-20" />
        <div className="h-5 rounded bg-[#161b22] w-20" />
        <div className="h-5 rounded bg-[#161b22] w-20" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[160px]" />
        ))}
      </div>
    </div>
  );
}
