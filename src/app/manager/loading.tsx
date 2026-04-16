export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-5 w-28 bg-[#161b22] rounded" />
        <div className="h-3 w-56 bg-[#161b22] rounded mt-2" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-16 bg-[#161b22] rounded-md" />
        ))}
      </div>
      <div className="rounded-xl bg-[#161b22] h-[300px]" />
    </div>
  );
}
