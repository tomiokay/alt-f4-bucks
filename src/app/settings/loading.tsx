export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-md">
      <div>
        <div className="h-5 w-24 bg-[#161b22] rounded" />
        <div className="h-3 w-48 bg-[#161b22] rounded mt-2" />
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-[#161b22] rounded-lg" />
        <div className="h-10 bg-[#161b22] rounded-lg" />
        <div className="h-10 bg-[#161b22] rounded-lg w-24" />
      </div>
    </div>
  );
}
