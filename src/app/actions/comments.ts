"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const commentSchema = z.object({
  matchKey: z.string().min(1),
  body: z.string().min(1, "Comment cannot be empty").max(2000),
  parentId: z.string().uuid().nullable(),
});

export async function postComment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = commentSchema.safeParse({
    matchKey: formData.get("matchKey"),
    body: formData.get("body"),
    parentId: formData.get("parentId") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    match_key: parsed.data.matchKey,
    body: parsed.data.body,
    parent_id: parsed.data.parentId,
  });

  if (error) return { error: error.message };

  // Notify parent comment author on reply
  if (parsed.data.parentId) {
    try {
      const service = await createServiceClient();
      const { data: parent } = await service
        .from("comments")
        .select("user_id")
        .eq("id", parsed.data.parentId)
        .single();

      if (parent && parent.user_id !== user.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        const name = profile?.display_name ?? "Someone";
        await service.from("notifications").insert({
          user_id: parent.user_id,
          type: "comment_reply",
          message: `${name} replied to your comment on ${parsed.data.matchKey}`,
          meta: { match_key: parsed.data.matchKey, parent_id: parsed.data.parentId },
        });
      }
    } catch {
      // Non-critical — don't fail the comment
    }
  }

  revalidatePath(`/market/${parsed.data.matchKey}`);
  return { success: true };
}
