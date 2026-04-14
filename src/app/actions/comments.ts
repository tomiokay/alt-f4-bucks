"use server";

import { createClient } from "@/lib/supabase/server";
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

  revalidatePath(`/market/${parsed.data.matchKey}`);
  return { success: true };
}
