export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-5 w-16 bg-[#161b22] rounded" />
        <div className="h-3 w-40 bg-[#161b22] rounded mt-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[200px]" />
        ))}
      </div>
    </div>
  );
}
