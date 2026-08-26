import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { supabase, type DbUserRole } from "../lib/supabase";

const router = Router();

type AppRole = "admin" | "editor" | "viewer";

function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "admin") return "admin";
  if (role === "editor" || role === "contributor") return "editor";
  return "viewer";
}

export async function getUserRole(
  clerkUserId: string
): Promise<AppRole> {
  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return normalizeRole((row as DbUserRole | null)?.role);
}

async function syncProfileFields(
  clerkUserId: string,
  email: string,
  name: string | null,
  imageUrl: string | null,
  log: { warn: (obj: unknown, msg: string) => void }
): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .update({ email, name, image_url: imageUrl })
    .eq("clerk_user_id", clerkUserId);
  if (error) {
    log.warn(error, "Could not sync profile fields (run SQL migration to add email/name/image_url columns)");
  }
}

router.get("/users/me", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    ) ?? clerkUser.emailAddresses[0];
    const email = primaryEmail?.emailAddress ?? "";
    const emailIsVerified = primaryEmail?.verification?.status === "verified";
    const name = clerkUser.fullName ?? null;
    const imageUrl = clerkUser.imageUrl ?? null;

    const { data: currentRow, error: currentRowError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("clerk_user_id", auth.userId)
      .maybeSingle();

    if (currentRowError) {
      req.log.error(currentRowError, "Failed to look up current user role");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let role = normalizeRole((currentRow as DbUserRole | null)?.role);

    // A recreated Clerk account can have a new user ID. Preserve an existing
    // elevated role when the verified primary email matches exactly.
    if (emailIsVerified && email && role === "viewer") {
      const { data: emailMatches, error: emailLookupError } = await supabase
        .from("user_roles")
        .select("clerk_user_id, role, email")
        .ilike("email", email)
        .limit(2);

      if (emailLookupError) {
        req.log.warn(emailLookupError, "Could not look up an existing role by email");
      } else {
        const elevatedMatches = (emailMatches ?? []).filter(
          (match) => normalizeRole(match.role) !== "viewer"
        );
        if (elevatedMatches.length === 1) {
          role = normalizeRole(elevatedMatches[0].role);
          const { error: roleRepairError } = await supabase
            .from("user_roles")
            .upsert(
              { clerk_user_id: auth.userId, role },
              { onConflict: "clerk_user_id" }
            );
          if (roleRepairError) {
            req.log.error(roleRepairError, "Failed to restore existing user role");
            res.status(500).json({ error: "Internal server error" });
            return;
          }
          req.log.info(
            { clerkUserId: auth.userId, role },
            "Restored role for a verified existing email"
          );
        }
      }
    }

    const { error: upsertError } = await supabase
      .from("user_roles")
      .upsert(
        { clerk_user_id: auth.userId, role },
        { onConflict: "clerk_user_id", ignoreDuplicates: true }
      );

    if (upsertError) {
      req.log.error(upsertError, "Failed to upsert user role");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    await syncProfileFields(auth.userId, email, name, imageUrl, req.log);

    res.json({ clerkUserId: auth.userId, email, name, imageUrl, role });
  } catch (err) {
    req.log.error(err, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const role = await getUserRole(auth.userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const { data: rows, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      req.log.error(error, "Supabase error listing users");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const users = (rows as DbUserRole[]).map((row) => ({
      clerkUserId: row.clerk_user_id,
      email: row.email ?? "",
      name: row.name ?? null,
      imageUrl: row.image_url ?? null,
      role: normalizeRole(row.role),
    }));

    res.json(users);
  } catch (err) {
    req.log.error(err, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:clerkUserId/role", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const callerRole = await getUserRole(auth.userId);
    if (callerRole !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const { clerkUserId } = req.params;
    const { role } = req.body as { role: "admin" | "editor" | "viewer" };

    if (!["admin", "editor", "viewer"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { clerk_user_id: clerkUserId, role },
        { onConflict: "clerk_user_id" }
      );

    if (error) {
      req.log.error(error, "Supabase error updating role");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = clerkUser.fullName ?? null;
    const imageUrl = clerkUser.imageUrl ?? null;

    await syncProfileFields(clerkUserId, email, name, imageUrl, req.log);

    res.json({ clerkUserId, email, name, imageUrl, role: normalizeRole(role) });
  } catch (err) {
    req.log.error(err, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
