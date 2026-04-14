export default function Loading() {
  return (
    <div className="flex gap-6 animate-pulse">
      <div className="flex-1 min-w-0 space-y-5">
        <div className="h-20 rounded-xl bg-[#161b22]" />
        <div className="h-[250px] rounded-xl bg-[#161b22]" />
        <div className="h-[200px] rounded-xl bg-[#161b22]" />
      </div>
      <div className="hidden md:block w-[320px] shrink-0 space-y-4">
        <div className="h-[350px] rounded-xl bg-[#161b22]" />
        <div className="h-[200px] rounded-xl bg-[#161b22]" />
      </div>
    </div>
  );
}
