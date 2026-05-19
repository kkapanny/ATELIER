import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { config } from "../../config.js";

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  user_agent: z.string().optional(),
});

router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: config.vapid.publicKey });
});

router.post("/subscribe", authenticate, validateBody(subscribeSchema), async (req, res, next) => {
  try {
    const { endpoint, keys, user_agent } = req.body;
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: req.user.id,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: user_agent,
      },
      update: {
        userId: req.user.id,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: user_agent,
        lastUsedAt: new Date(),
      },
    });
    res.status(201).json({ id: sub.id, endpoint: sub.endpoint });
  } catch (e) { next(e); }
});

router.delete("/subscribe", authenticate, async (req, res, next) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint_required" });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/devices", authenticate, async (req, res, next) => {
  try {
    const devices = await prisma.pushSubscription.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(devices);
  } catch (e) { next(e); }
});

export default router;
