import { Router } from "express";
import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";

const router = Router();

export async function getUserRole(
  clerkUserId: string
): Promise<"admin" | "contributor" | "public"> {
  const [row] = await db
    .select()
    .from(userRolesTable)
    .where(eq(userRolesTable.clerkUserId, clerkUserId));
  return (row?.role as "admin" | "contributor" | "public") ?? "public";
}

router.get("/users/me", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await db
      .insert(userRolesTable)
      .values({ clerkUserId: auth.userId, role: "public" })
      .onConflictDoNothing();

    const [row] = await db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.clerkUserId, auth.userId));

    const role = (row?.role as "admin" | "contributor" | "public") ?? "public";

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

    const rows = await db.select().from(userRolesTable);
    const users = await Promise.all(
      rows.map(async (row) => {
        try {
          const clerkUser = await clerkClient.users.getUser(row.clerkUserId);
          return {
            clerkUserId: row.clerkUserId,
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

    await db
      .insert(userRolesTable)
      .values({ clerkUserId, role })
      .onConflictDoUpdate({
        target: userRolesTable.clerkUserId,
        set: { role },
      });

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
