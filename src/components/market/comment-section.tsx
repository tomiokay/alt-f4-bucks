"use client";

import { useState, useRef } from "react";
import { postComment } from "@/app/actions/comments";
import { useRouter } from "next/navigation";
import type { CommentWithProfile } from "@/lib/types";

type Props = {
  matchKey: string;
  comments: CommentWithProfile[];
  userId: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CommentSection({ matchKey, comments, userId }: Props) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();

  async function handlePost(parentId: string | null, text: string) {
    if (submitting.current || !text.trim()) return;
    submitting.current = true;
    setLoading(true);

    const formData = new FormData();
    formData.set("matchKey", matchKey);
    formData.set("body", text.trim());
    if (parentId) formData.set("parentId", parentId);

    await postComment(formData);
    setLoading(false);
    submitting.current = false;
    setBody("");
    setReplyBody("");
    setReplyTo(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl bg-[#161b22] p-4">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-[14px] font-semibold text-[#e6edf3]">
          Comments ({comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)})
        </h3>
      </div>

      {/* Comment input */}
      <div className="flex gap-3 mb-5">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
          You
        </div>
        <div className="flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full rounded-lg bg-[#0d1117] border border-[#21262d] px-3 py-2 text-[13px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none resize-none"
          />
          {body.trim() && (
            <div className="flex justify-end mt-1.5">
              <button
                onClick={() => handlePost(null, body)}
                disabled={loading}
                className="rounded-lg bg-[#22c55e] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50 transition-colors"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-[13px] text-[#484f58] text-center py-4">No comments yet</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <CommentRow
                comment={comment}
                onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              />

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-9 mt-2 space-y-2 border-l border-[#21262d] pl-3">
                  {comment.replies.map((reply) => (
                    <CommentRow key={reply.id} comment={reply} />
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyTo === comment.id && (
                <div className="ml-9 mt-2 flex gap-2">
                  <input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 h-8 rounded-lg bg-[#0d1117] border border-[#21262d] px-3 text-[12px] text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#388bfd] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyBody.trim()) {
                        handlePost(comment.id, replyBody);
                      }
                    }}
                  />
                  <button
                    onClick={() => handlePost(comment.id, replyBody)}
                    disabled={loading || !replyBody.trim()}
                    className="rounded-lg bg-[#21262d] px-3 py-1 text-[11px] font-medium text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-40 transition-colors"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
}: {
  comment: CommentWithProfile;
  onReply?: () => void;
}) {
  const initials = comment.user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div className="flex gap-2.5">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#e6edf3]">
            {comment.user?.display_name ?? "Anonymous"}
          </span>
          <span className="text-[11px] text-[#484f58]">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-[13px] text-[#c9d1d9] mt-0.5 whitespace-pre-wrap break-words">
          {comment.body}
        </p>
        {onReply && (
          <button
            onClick={onReply}
            className="text-[11px] text-[#7d8590] hover:text-[#e6edf3] mt-1 transition-colors"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
