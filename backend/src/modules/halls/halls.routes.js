import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const halls = await prisma.hall.findMany({ orderBy: { id: "asc" } });
    res.json(halls);
  } catch (e) { next(e); }
});

export default router;
