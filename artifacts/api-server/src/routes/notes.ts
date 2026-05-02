import { Router } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getUserRole } from "./users";
import { CreateNoteBody, UpdateNoteBody } from "@workspace/api-zod";

const router = Router();

router.get("/notes", async (req, res): Promise<void> => {
  try {
    const { category, search } = req.query as {
      category?: string;
      search?: string;
    };

    let notes = await db.select().from(notesTable).orderBy(notesTable.createdAt);

    if (category && category !== "All Notes") {
      notes = notes.filter((n) => n.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          n.category.toLowerCase().includes(q)
      );
    }

    res.json(
      notes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err, "Failed to list notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [note] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, id));

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to get note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notes", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const role = await getUserRole(auth.userId);
    if (role !== "admin" && role !== "contributor") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const parsed = CreateNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { type, title, content, category, tags, pinned } = parsed.data;

    const [note] = await db
      .insert(notesTable)
      .values({
        type,
        title,
        content,
        category,
        tags: tags ?? [],
        pinned: pinned ?? false,
        createdByClerkId: auth.userId,
      })
      .returning();

    res.status(201).json({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to create note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const role = await getUserRole(auth.userId);
    const isOwner = existing.createdByClerkId === auth.userId;

    if (role !== "admin" && !(role === "contributor" && isOwner)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const parsed = UpdateNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(notesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(notesTable.id, id))
      .returning();

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to update note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  try {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const role = await getUserRole(auth.userId);
    const isOwner = existing.createdByClerkId === auth.userId;

    if (role !== "admin" && !(role === "contributor" && isOwner)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    await db.delete(notesTable).where(eq(notesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notes/:id/pin", async (req, res): Promise<void> => {
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

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const [updated] = await db
      .update(notesTable)
      .set({ pinned: !existing.pinned, updatedAt: new Date() })
      .where(eq(notesTable.id, id))
      .returning();

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to toggle pin");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
