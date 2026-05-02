import { Router } from "express";
import { getAuth } from "@clerk/express";
import { supabase, mapNote, type DbNote } from "../lib/supabase";
import { getUserRole } from "./users";
import { CreateNoteBody, UpdateNoteBody } from "@workspace/api-zod";

const router = Router();

router.get("/notes", async (req, res): Promise<void> => {
  try {
    const { category, search } = req.query as {
      category?: string;
      search?: string;
    };

    let query = supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: true });

    if (category && category !== "All Notes") {
      query = query.eq("category", category);
    }

    const { data: notes, error } = await query;

    if (error) {
      req.log.error(error, "Supabase error listing notes");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    let result = (notes as DbNote[]).map(mapNote);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          n.category.toLowerCase().includes(q)
      );
    }

    res.json(result);
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

    const { data: note, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.json(mapNote(note as DbNote));
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

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        type,
        title,
        content,
        category,
        tags: tags ?? [],
        pinned: pinned ?? false,
        created_by_clerk_id: auth.userId,
      })
      .select()
      .single();

    if (error || !note) {
      req.log.error(error, "Supabase error creating note");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.status(201).json(mapNote(note as DbNote));
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

    const { data: existing, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const existingNote = existing as DbNote;
    const role = await getUserRole(auth.userId);
    const isOwner = existingNote.created_by_clerk_id === auth.userId;

    if (role !== "admin" && !(role === "contributor" && isOwner)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const parsed = UpdateNoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
    if (parsed.data.pinned !== undefined) updateData.pinned = parsed.data.pinned;

    const { data: updated, error: updateErr } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      req.log.error(updateErr, "Supabase error updating note");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.json(mapNote(updated as DbNote));
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

    const { data: existing, error: fetchErr } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const existingNote = existing as DbNote;
    const role = await getUserRole(auth.userId);
    const isOwner = existingNote.created_by_clerk_id === auth.userId;

    if (role !== "admin" && !(role === "contributor" && isOwner)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const { error: deleteErr } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      req.log.error(deleteErr, "Supabase error deleting note");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

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

    const { data: existing, error: fetchErr } = await supabase
      .from("notes")
      .select("pinned")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("notes")
      .update({
        pinned: !(existing as { pinned: boolean }).pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      req.log.error(updateErr, "Supabase error toggling pin");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.json(mapNote(updated as DbNote));
  } catch (err) {
    req.log.error(err, "Failed to toggle pin");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
