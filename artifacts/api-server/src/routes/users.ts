import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { supabase, type DbUserRole } from "../lib/supabase";

const router = Router();

export async function getUserRole(
  clerkUserId: string
): Promise<"admin" | "contributor" | "public"> {
  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return ((row as DbUserRole | null)?.role as "admin" | "contributor" | "public") ?? "public";
}

router.get("/users/me", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await supabase
      .from("user_roles")
      .upsert(
        { clerk_user_id: auth.userId, role: "public" },
        { onConflict: "clerk_user_id", ignoreDuplicates: true }
      );

    const { data: row } = await supabase
      .from("user_roles")
      .select("role")
      .eq("clerk_user_id", auth.userId)
      .single();

    const role = ((row as DbUserRole | null)?.role as "admin" | "contributor" | "public") ?? "public";

    const clerkUser = await clerkClient.users.getUser(auth.userId);

    res.json({
      clerkUserId: auth.userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser.fullName ?? null,
      imageUrl: clerkUser.imageUrl ?? null,
      role,
    });
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

    const users = await Promise.all(
      (rows as DbUserRole[]).map(async (row) => {
        try {
          const clerkUser = await clerkClient.users.getUser(row.clerk_user_id);
          return {
            clerkUserId: row.clerk_user_id,
            email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
            name: clerkUser.fullName ?? null,
            imageUrl: clerkUser.imageUrl ?? null,
            role: row.role as "admin" | "contributor" | "public",
          };
        } catch {
          return null;
        }
      })
    );

    res.json(users.filter(Boolean));
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
    const { role } = req.body as { role: "admin" | "contributor" | "public" };

    if (!["admin", "contributor", "public"].includes(role)) {
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

    res.json({
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name: clerkUser.fullName ?? null,
      imageUrl: clerkUser.imageUrl ?? null,
      role,
    });
  } catch (err) {
    req.log.error(err, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
