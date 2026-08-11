/* ============================================================================
   src/lib/db.js — DATA ACCESS HELPERS (Supabase)
   ----------------------------------------------------------------------------
   Thin, named wrapper functions per operation — same style as lib/api.js's
   callDiagnosis()/callJobsReport(), but calling Supabase directly instead of
   a backend route (see src/lib/supabase.js for why that's correct here).
   Every table has Row Level Security policies (supabase/migrations/) that
   independently enforce who can read/write what; these helpers don't
   duplicate that logic, they just shape the queries.
   ============================================================================ */

import { supabase } from "./supabase.js";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------------------------------------------------------------- */
/* Profiles                                                                */
/* ---------------------------------------------------------------------- */

export async function getProfile(userId) {
  return unwrap(
    await supabase.from("profiles").select("*").eq("id", userId).single()
  );
}

export async function updateProfile(userId, fields) {
  return unwrap(
    await supabase
      .from("profiles")
      .update(fields)
      .eq("id", userId)
      .select("*")
      .single()
  );
}

export async function listProfiles(query, { excludeUserId } = {}) {
  let q = supabase
    .from("profiles")
    .select("id, full_name, specialty, avatar_url")
    .order("full_name")
    .limit(20);
  if (query) q = q.ilike("full_name", `%${query}%`);
  if (excludeUserId) q = q.neq("id", excludeUserId);
  return unwrap(await q);
}

/* ---------------------------------------------------------------------- */
/* Posts / likes / comments                                                */
/* ---------------------------------------------------------------------- */

export async function getPosts(currentUserId) {
  const posts = unwrap(
    await supabase
      .from("posts")
      .select(
        `id, content, image_url, created_at, author_id,
         author:profiles!posts_author_id_fkey(id, full_name, avatar_url, specialty),
         post_likes(count),
         post_comments(count)`
      )
      .order("created_at", { ascending: false })
  );

  const myLikes = unwrap(
    await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", currentUserId)
  );
  const likedPostIds = new Set(myLikes.map((l) => l.post_id));

  return posts.map((p) => ({
    ...p,
    likeCount: p.post_likes?.[0]?.count ?? 0,
    commentCount: p.post_comments?.[0]?.count ?? 0,
    likedByMe: likedPostIds.has(p.id),
  }));
}

export async function createPost(authorId, content, imageUrl) {
  return unwrap(
    await supabase
      .from("posts")
      .insert({ author_id: authorId, content, image_url: imageUrl || null })
      .select("*")
      .single()
  );
}

export async function toggleLike(postId, userId, isCurrentlyLiked) {
  if (isCurrentlyLiked) {
    return unwrap(
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
    );
  }
  return unwrap(
    await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId })
  );
}

export async function getComments(postId) {
  return unwrap(
    await supabase
      .from("post_comments")
      .select(
        `id, content, created_at, author_id,
         author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)`
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
  );
}

export async function addComment(postId, authorId, content) {
  return unwrap(
    await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: authorId, content })
      .select(
        `id, content, created_at, author_id,
         author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url)`
      )
      .single()
  );
}

/* ---------------------------------------------------------------------- */
/* Messages (group-capable conversations)                                  */
/* ---------------------------------------------------------------------- */

export async function listConversations(userId) {
  const participantRows = unwrap(
    await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)
  );
  const conversationIds = participantRows.map((r) => r.conversation_id);
  if (conversationIds.length === 0) return [];

  const conversations = unwrap(
    await supabase
      .from("conversations")
      .select(
        `id, created_at,
         conversation_participants(user_id, profiles(id, full_name, avatar_url)),
         messages(content, created_at)`
      )
      .in("id", conversationIds)
  );

  return conversations
    .map((c) => {
      const participants = c.conversation_participants
        .map((p) => p.profiles)
        .filter((p) => p && p.id !== userId);
      const lastMessage = [...c.messages].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )[0];
      return { id: c.id, participants, lastMessage };
    })
    .sort((a, b) => {
      const at = a.lastMessage?.created_at ?? "";
      const bt = b.lastMessage?.created_at ?? "";
      return bt.localeCompare(at);
    });
}

export async function createConversation(creatorId, participantIds) {
  const conversation = unwrap(
    await supabase
      .from("conversations")
      .insert({ created_by: creatorId })
      .select("*")
      .single()
  );

  const uniqueParticipantIds = [...new Set([creatorId, ...participantIds])];
  unwrap(
    await supabase.from("conversation_participants").insert(
      uniqueParticipantIds.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
      }))
    )
  );

  return conversation;
}

export async function getMessages(conversationId) {
  return unwrap(
    await supabase
      .from("messages")
      .select(
        `id, content, created_at, sender_id,
         sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)`
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
  );
}

export async function sendMessage(conversationId, senderId, content) {
  return unwrap(
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: senderId, content })
      .select("*")
      .single()
  );
}

/* ---------------------------------------------------------------------- */
/* Jobs ("Vagas") + applications                                            */
/* ---------------------------------------------------------------------- */

export async function getJobs(currentUserId) {
  const jobs = unwrap(
    await supabase
      .from("jobs")
      .select(
        `id, title, description, employer_name, location, salary_range,
         contact_info, status, created_at, author_id,
         author:profiles!jobs_author_id_fkey(id, full_name, avatar_url),
         job_applications(count)`
      )
      .order("created_at", { ascending: false })
  );

  const myApplications = unwrap(
    await supabase
      .from("job_applications")
      .select("job_id")
      .eq("applicant_id", currentUserId)
  );
  const appliedJobIds = new Set(myApplications.map((a) => a.job_id));

  return jobs.map((j) => ({
    ...j,
    applicationCount: j.job_applications?.[0]?.count ?? 0,
    appliedByMe: appliedJobIds.has(j.id),
  }));
}

export async function createJob(authorId, fields) {
  return unwrap(
    await supabase
      .from("jobs")
      .insert({ author_id: authorId, ...fields })
      .select("*")
      .single()
  );
}

export async function applyToJob(jobId, applicantId, message) {
  return unwrap(
    await supabase
      .from("job_applications")
      .insert({ job_id: jobId, applicant_id: applicantId, message: message || null })
      .select("*")
      .single()
  );
}

/* ---------------------------------------------------------------------- */
/* SOAP cases + peer-discussion comments                                   */
/* ---------------------------------------------------------------------- */

export async function getMySoapCases(userId) {
  return unwrap(
    await supabase
      .from("soap_cases")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
  );
}

export async function getSharedSoapCases(currentUserId) {
  return unwrap(
    await supabase
      .from("soap_cases")
      .select(
        `*, author:profiles!soap_cases_author_id_fkey(id, full_name, avatar_url)`
      )
      .eq("visibility", "shared")
      .neq("author_id", currentUserId)
      .order("created_at", { ascending: false })
  );
}

export async function createSoapCase(authorId, fields) {
  return unwrap(
    await supabase
      .from("soap_cases")
      .insert({ author_id: authorId, ...fields })
      .select("*")
      .single()
  );
}

export async function getSoapCaseComments(caseId) {
  return unwrap(
    await supabase
      .from("soap_case_comments")
      .select(
        `id, content, created_at, author_id,
         author:profiles!soap_case_comments_author_id_fkey(id, full_name, avatar_url)`
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
  );
}

export async function addSoapCaseComment(caseId, authorId, content) {
  return unwrap(
    await supabase
      .from("soap_case_comments")
      .insert({ case_id: caseId, author_id: authorId, content })
      .select(
        `id, content, created_at, author_id,
         author:profiles!soap_case_comments_author_id_fkey(id, full_name, avatar_url)`
      )
      .single()
  );
}
