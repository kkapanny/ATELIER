import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { config } from "../../config.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../middleware/error.js";

const router = Router();

/**
 * Авторизация — по логину (а не email), как в макете и в требованиях.
 */
const loginSchema = z.object({
  login: z.string().min(2),
  password: z.string().min(3),
});

const registerSchema = z.object({
  login: z.string().trim().min(1, "login_required").max(40),
  password: z.string().min(1, "password_required").min(3, "password_too_short"),
  fullName: z.string().trim().min(2),
  phone: z
    .string()
    .trim()
    .min(1, "phone_required")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid"),
  gender: z.enum(["male", "female"]),
  role: z.literal("client").default("client"),
  consent: z.literal(true, { errorMap: () => ({ message: "consent_required" }) }),
});

async function issueTokens(user) {
  const access = signAccessToken({ id: user.id, role: user.role, login: user.login });
  const refresh = signRefreshToken({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });
  return { access, refresh };
}

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { login, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { login },
      include: { client: true, master: true },
    });
    if (!user || user.isBlocked) throw new HttpError(401, "invalid_credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "invalid_credentials");

    const { access, refresh } = await issueTokens(user);
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.json({
      accessToken: access,
      user: serializeUser(user),
    });
  } catch (e) { next(e); }
});

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { login, password, fullName, phone, gender } = req.body;

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) throw new HttpError(409, "login_already_taken");

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        login,
        phone,
        passwordHash,
        role: "client",
        client: { create: { fullName, gender, category: "casual", phone } },
      },
      include: { client: true, master: true },
    });

    const { access, refresh } = await issueTokens(user);
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.status(201).json({ accessToken: access, user: serializeUser(user) });
  } catch (e) { next(e); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) throw new HttpError(401, "no_refresh_token");

    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored || stored.expiresAt < new Date()) throw new HttpError(401, "refresh_expired");

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { client: true, master: true },
    });
    if (!user || user.isBlocked) throw new HttpError(401, "user_blocked");

    // Ротация refresh
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const { access, refresh } = await issueTokens(user);
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.json({ accessToken: access, user: serializeUser(user) });
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
  });
  res.json({ ok: true });
});

function serializeUser(user) {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    role: user.role,
    fullName: user.client?.fullName || user.master?.fullName || user.login,
    discountPercent: user.client?.discountPercent || 0,
    category: user.client?.category || null,
    masterId: user.master?.id || null,
    clientId: user.client?.id || null,
  };
}

export default router;
