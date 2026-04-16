export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-5 w-24 bg-[#161b22] rounded" />
        <div className="h-3 w-48 bg-[#161b22] rounded mt-2" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#161b22] h-[100px]" />
        ))}
      </div>
    </div>
  );
}
