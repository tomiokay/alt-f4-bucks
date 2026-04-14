export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 rounded bg-[#161b22] w-32" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[160px]" />
        ))}
      </div>
    </div>
  );
}
