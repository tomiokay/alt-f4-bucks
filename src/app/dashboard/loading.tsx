export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#161b22]" />
            <div className="space-y-2">
              <div className="h-5 rounded bg-[#161b22] w-32" />
              <div className="h-4 rounded bg-[#161b22] w-20" />
            </div>
          </div>
          <div className="flex gap-8">
            <div className="h-10 rounded bg-[#161b22] w-24" />
            <div className="h-10 rounded bg-[#161b22] w-24" />
            <div className="h-10 rounded bg-[#161b22] w-24" />
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-[#161b22] h-[300px]" />
    </div>
  );
}
