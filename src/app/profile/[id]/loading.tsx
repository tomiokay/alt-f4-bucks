export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-[#161b22]" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-[#161b22] rounded" />
          <div className="h-3 w-20 bg-[#161b22] rounded" />
        </div>
      </div>
      <div className="grid gap-3 grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[80px]" />
        ))}
      </div>
      <div className="rounded-xl bg-[#161b22] h-[200px]" />
    </div>
  );
}
