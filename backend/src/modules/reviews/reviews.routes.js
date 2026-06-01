import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../middleware/error.js";

const router = Router();

const schema = z.object({
  appointmentId: z.number().int(),
  rating: z.number().int().min(1).max(5),
  text: z.string().optional(),
});

router.post("/", authenticate, requireRole("client"), validateBody(schema), async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({ where: { userId: req.user.id } });
    if (!client) throw new HttpError(403, "client_required");

    const appt = await prisma.appointment.findUnique({ where: { id: req.body.appointmentId } });
    if (!appt || appt.clientId !== client.id) throw new HttpError(404, "appointment_not_found");
    if (appt.status !== "completed") throw new HttpError(400, "review_not_allowed");

    const review = await prisma.review.upsert({
      where: { appointmentId: appt.id },
      create: {
        appointmentId: appt.id,
        clientId: client.id,
        masterId: appt.masterId,
        rating: req.body.rating,
        text: req.body.text,
      },
      update: { rating: req.body.rating, text: req.body.text },
    });

    // Пересчёт среднего рейтинга мастера
    const agg = await prisma.review.aggregate({
      where: { masterId: appt.masterId },
      _avg: { rating: true },
    });
    await prisma.master.update({
      where: { id: appt.masterId },
      data: { averageRating: agg._avg.rating || 0 },
    });

    res.status(201).json(review);
  } catch (e) { next(e); }
});

export default router;
