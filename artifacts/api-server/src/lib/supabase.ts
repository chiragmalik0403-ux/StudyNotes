import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface DbNote {
  id: number;
  type: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  created_by_clerk_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: number;
  clerk_user_id: string;
  role: string;
  created_at: string;
}

export function mapNote(row: DbNote) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags,
    pinned: row.pinned,
    createdByClerkId: row.created_by_clerk_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
