import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { asyncHandler, HttpError, requireAdmin } from "../lib/http.js";
import { contactInputSchema } from "../lib/validators.js";

export const contactsRouter = Router();

contactsRouter.post(
  "/contacts",
  asyncHandler(async (req, res) => {
    const input = contactInputSchema.parse(req.body);
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        budget: input.budget,
        source: input.source ?? "Website",
        project_details: input.projectDetails,
      })
      .select("*")
      .single();

    if (error) throw new HttpError(400, "Unable to submit contact request.", error);
    res.status(201).json({ contact: data });
  }),
);

contactsRouter.get(
  "/admin/contacts",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
    if (error) throw new HttpError(500, "Unable to fetch contacts.", error);
    res.json({ contacts: data ?? [] });
  }),
);
