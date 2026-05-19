import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hallId = req.query.hall_id ? Number(req.query.hall_id) : undefined;
    const services = await prisma.service.findMany({
      where: { isActive: true, hallId },
      include: { hall: true },
      orderBy: { id: "asc" },
    });
    res.json(services);
  } catch (e) { next(e); }
});

export default router;
