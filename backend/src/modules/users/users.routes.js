import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";

const router = Router();

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        client: true,
        master: { include: { hall: true } },
        pushSubscriptions: true,
      },
    });
    res.json(user);
  } catch (e) { next(e); }
});

const patchSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.enum(["male", "female"]).optional(),
});

router.patch("/me", authenticate, validateBody(patchSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const data = {};
    if (req.body.email) data.email = req.body.email;
    if (req.body.phone) data.phone = req.body.phone;

    await prisma.user.update({ where: { id: user.id }, data });

    if (user.role === "client") {
      await prisma.client.update({
        where: { userId: user.id },
        data: {
          fullName: req.body.fullName,
          phone: req.body.phone,
          gender: req.body.gender,
        },
      });
    } else if (user.role === "master") {
      await prisma.master.update({
        where: { userId: user.id },
        data: {
          fullName: req.body.fullName,
          gender: req.body.gender,
        },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true, master: true },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
