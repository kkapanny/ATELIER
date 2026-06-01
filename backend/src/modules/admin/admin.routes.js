import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync } from "fs";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../middleware/error.js";
import { scheduleReminders, cancelReminders } from "../../queue/reminders.queue.js";
import { isWithinWorkSchedule, validateBookingStart } from "../../lib/work-schedule.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "..", "..", "..", "uploads", "masters");
mkdirSync(uploadsDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("only_images_allowed"));
  },
});

const router = Router();

function categoryDiscount(category) {
  return category === "regular" ? 10 : 0;
}

async function createAppointmentForClient(clientId, { masterId, serviceId, startsAt }) {
  const start = new Date(startsAt);
  if (isNaN(start.getTime())) throw new HttpError(400, "invalid_date");

  const bookingError = validateBookingStart(start, { minLeadMinutes: 0 });
  if (bookingError) throw new HttpError(400, bookingError);

  const [client, master, service] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.master.findUnique({ where: { id: masterId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!client) throw new HttpError(404, "client_not_found");
  if (!master) throw new HttpError(404, "master_not_found");
  if (!service) throw new HttpError(404, "service_not_found");

  const link = await prisma.masterService.findUnique({
    where: { masterId_serviceId: { masterId, serviceId } },
  });
  if (!link) throw new HttpError(400, "master_does_not_provide_service");

  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);
  if (!isWithinWorkSchedule(master.workSchedule, start, end)) {
    throw new HttpError(400, "outside_work_schedule");
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({
      where: {
        masterId,
        status: { in: ["planned", "confirmed", "completed"] },
        AND: [{ startsAt: { lt: end } }, { endsAt: { gt: start } }],
      },
    });
    if (conflict) throw new HttpError(409, "slot_taken");

    const price = Number(service.price);
    const discount = client.discountPercent
      ? Math.round(price * (client.discountPercent / 100) * 100) / 100
      : 0;

    return tx.appointment.create({
      data: {
        clientId,
        masterId,
        serviceId,
        startsAt: start,
        endsAt: end,
        status: "confirmed",
        priceAtBooking: price,
        discountApplied: discount,
      },
      include: { master: true, service: true, client: true },
    });
  });

  await scheduleReminders(appointment);
  return appointment;
}

router.use(authenticate, requireRole("admin"));

// ===========================================================
// CRUD клиенты
// ===========================================================
router.get("/clients", async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: { user: true },
      orderBy: { id: "asc" },
    });
    res.json(clients);
  } catch (e) { next(e); }
});

const createClientSchema = z
  .object({
    firstName: z.string().trim().min(1, "first_name_required"),
    lastName: z.string().trim().min(1, "last_name_required"),
    phone: z
      .string()
      .trim()
      .min(1, "phone_required")
      .refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid"),
    gender: z.enum(["male", "female"]),
    login: z.string().trim().max(40).optional(),
    password: z.string().optional(),
    category: z.enum(["regular", "casual"]).default("casual"),
    discountPercent: z.number().int().min(0).max(50).default(0),
  })
  .superRefine((data, ctx) => {
    const hasLogin = Boolean(data.login);
    const hasPassword = Boolean(data.password);
    if (hasLogin !== hasPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "login_password_together",
        path: ["login"],
      });
    }
    if (hasLogin && (data.login?.length ?? 0) < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "login_too_short", path: ["login"] });
    }
    if (hasPassword && (data.password?.length ?? 0) < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "password_too_short", path: ["password"] });
    }
  });

router.post("/clients", validateBody(createClientSchema), async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      gender,
      login,
      password,
      category,
      discountPercent,
    } = req.body;
    const fullName = `${firstName} ${lastName}`.trim();

    if (login) {
      const existing = await prisma.user.findUnique({ where: { login } });
      if (existing) throw new HttpError(409, "login_already_taken");

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          login,
          passwordHash,
          role: "client",
          phone,
          client: {
            create: {
              fullName,
              gender,
              category,
              discountPercent,
              phone,
            },
          },
        },
        include: { client: { include: { user: true } } },
      });
      return res.status(201).json(user.client);
    }

    const client = await prisma.client.create({
      data: {
        fullName,
        gender,
        phone,
        category,
        discountPercent,
      },
      include: { user: true },
    });
    res.status(201).json(client);
  } catch (e) { next(e); }
});

const updateClientSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "phone_invalid"),
    category: z.enum(["regular", "casual"]).optional(),
    login: z.string().trim().max(40).optional(),
    password: z.string().optional(),
    addAccount: z.boolean().optional(),
    removeAccount: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.addAccount) {
      if (!data.login || data.login.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "login_required", path: ["login"] });
      }
      if (!data.password || data.password.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "password_required", path: ["password"] });
      }
    }
    if (data.password && data.password.length > 0 && data.password.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "password_too_short", path: ["password"] });
    }
    if (data.login && data.login.length > 0 && data.login.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "login_too_short", path: ["login"] });
    }
  });

router.get("/clients/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!client) throw new HttpError(404, "not_found");
    res.json(client);
  } catch (e) { next(e); }
});

router.patch("/clients/:id", validateBody(updateClientSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!client) throw new HttpError(404, "not_found");

    const { fullName, phone, category, login, password, addAccount, removeAccount } = req.body;

    if (removeAccount && client.userId) {
      await prisma.user.delete({ where: { id: client.userId } });
      const updated = await prisma.client.findUnique({
        where: { id },
        include: { user: true },
      });
      return res.json(updated);
    }

    const clientData = {};
    if (fullName !== undefined) clientData.fullName = fullName;
    if (phone !== undefined) {
      clientData.phone = phone;
    }
    if (category !== undefined) {
      clientData.category = category;
      clientData.discountPercent = categoryDiscount(category);
    }

    if (addAccount && !client.userId) {
      if (!login || !password) throw new HttpError(400, "login_password_required");
      const existing = await prisma.user.findUnique({ where: { login } });
      if (existing) throw new HttpError(409, "login_already_taken");

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          login,
          passwordHash,
          role: "client",
          phone: phone ?? client.phone,
        },
      });
      clientData.userId = user.id;
    } else if (client.userId) {
      const userData = {};
      if (phone !== undefined) userData.phone = phone;
      if (login && login !== client.user.login) {
        const existing = await prisma.user.findUnique({ where: { login } });
        if (existing && existing.id !== client.userId) throw new HttpError(409, "login_already_taken");
        userData.login = login;
      }
      if (password) {
        userData.passwordHash = await bcrypt.hash(password, 10);
      }
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({ where: { id: client.userId }, data: userData });
      }
    }

    if (Object.keys(clientData).length > 0) {
      await prisma.client.update({ where: { id }, data: clientData });
    }

    const updated = await prisma.client.findUnique({
      where: { id },
      include: { user: true },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/clients/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: "not_found" });
    const userId = client.userId;
    await prisma.client.delete({ where: { id } });
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/clients/:id/appointments", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new HttpError(404, "not_found");

    const items = await prisma.appointment.findMany({
      where: { clientId: id },
      orderBy: { startsAt: "desc" },
      include: { master: true, service: true },
    });
    res.json(items);
  } catch (e) { next(e); }
});

const adminAppointmentSchema = z.object({
  masterId: z.number().int(),
  serviceId: z.number().int(),
  startsAt: z.string(),
});

router.post("/clients/:id/appointments", validateBody(adminAppointmentSchema), async (req, res, next) => {
  try {
    const clientId = Number(req.params.id);
    const appointment = await createAppointmentForClient(clientId, req.body);
    res.status(201).json(appointment);
  } catch (e) { next(e); }
});

const patchAppointmentSchema = z.object({
  startsAt: z.string().optional(),
  status: z.enum(["planned", "confirmed", "completed", "cancelled", "no_show", "service_refused"]).optional(),
});

router.patch("/appointments/:id", validateBody(patchAppointmentSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!appointment) throw new HttpError(404, "appointment_not_found");

    const data = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.startsAt) {
      const start = new Date(req.body.startsAt);
      const bookingError = validateBookingStart(start, { minLeadMinutes: 0 });
      if (bookingError) throw new HttpError(400, bookingError);
      data.startsAt = start;
      data.endsAt = new Date(start.getTime() + appointment.service.durationMin * 60 * 1000);
    }
    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: { master: true, service: true, client: true },
    });

    if (data.startsAt) {
      await cancelReminders(id);
      await scheduleReminders(updated);
    }
    if (data.status === "cancelled" || data.status === "no_show" || data.status === "service_refused") {
      await cancelReminders(id);
    }
    res.json(updated);
  } catch (e) { next(e); }
});

// ===========================================================
// Мастера: модерация и активация
// ===========================================================
router.get("/masters", async (_req, res, next) => {
  try {
    const masters = await prisma.master.findMany({
      include: { user: true, hall: true, services: { include: { service: true } } },
      orderBy: { id: "asc" },
    });
    res.json(masters);
  } catch (e) { next(e); }
});

const createMasterSchema = z.object({
  fullName: z.string().trim().min(2),
  login: z.string().trim().min(2).max(40),
  password: z.string().min(3),
  phone: z
    .string()
    .trim()
    .min(1)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid"),
  hallName: z.enum(["male", "female"]),
  serviceIds: z.array(z.number().int()).min(1),
  specialties: z
    .array(z.enum(["Стрижка", "Окрашивание", "Уход за волосами", "Макияж", "Борода", "Маникюр"]))
    .min(1),
  rank: z.number().int().min(1).max(5),
  experienceYears: z.number().int().min(0).max(50),
  bio: z.string().trim().optional(),
  avatarUrl: z.string().optional(),
});

router.post("/masters", validateBody(createMasterSchema), async (req, res, next) => {
  try {
    const {
      fullName,
      login,
      password,
      phone,
      hallName,
      serviceIds,
      specialties,
      rank,
      experienceYears,
      bio,
      avatarUrl,
    } = req.body;

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) throw new HttpError(409, "login_already_taken");

    const hall = await prisma.hall.findUnique({ where: { name: hallName } });
    if (!hall) throw new HttpError(400, "hall_not_found");

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, hallId: hall.id, isActive: true },
    });
    if (services.length !== serviceIds.length) {
      throw new HttpError(400, "invalid_services_for_hall");
    }

    const gender = hallName === "male" ? "male" : "female";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        login,
        phone,
        passwordHash,
        role: "master",
        master: {
          create: {
            fullName,
            gender,
            hallId: hall.id,
            rank,
            experienceYears,
            bio: bio || null,
            specialties,
            avatarUrl: avatarUrl || null,
            isActive: true,
            services: {
              create: serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
        },
      },
      include: {
        master: {
          include: { hall: true, services: { include: { service: true } } },
        },
      },
    });

    res.status(201).json(user.master);
  } catch (e) { next(e); }
});

router.post("/masters/:id/activate", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.master.update({ where: { id }, data: { isActive: true } });
    res.json(updated);
  } catch (e) { next(e); }
});

const updateMasterSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  login: z.string().trim().min(2).max(40).optional(),
  password: z.string().min(3).optional(),
  phone: z.string().trim().min(1).refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid").optional(),
  hallName: z.enum(["male", "female"]).optional(),
  serviceIds: z.array(z.number().int()).min(1).optional(),
  specialties: z.array(z.enum(["Стрижка", "Окрашивание", "Уход за волосами", "Макияж", "Борода", "Маникюр"])).min(1).optional(),
  rank: z.number().int().min(1).max(5).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  bio: z.string().trim().optional(),
  avatarUrl: z.string().optional(),
});

router.patch("/masters/:id", validateBody(updateMasterSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({ where: { id }, include: { user: true } });
    if (!master) throw new HttpError(404, "master_not_found");

    const { fullName, login, password, phone, hallName, serviceIds, specialties, rank, experienceYears, bio, avatarUrl } = req.body;

    const masterData = {};
    const userData = {};

    if (fullName !== undefined) masterData.fullName = fullName;
    if (rank !== undefined) masterData.rank = rank;
    if (experienceYears !== undefined) masterData.experienceYears = experienceYears;
    if (bio !== undefined) masterData.bio = bio || null;
    if (specialties !== undefined) masterData.specialties = specialties;
    if (avatarUrl !== undefined) masterData.avatarUrl = avatarUrl || null;

    if (hallName !== undefined) {
      const hall = await prisma.hall.findUnique({ where: { name: hallName } });
      if (!hall) throw new HttpError(400, "hall_not_found");
      masterData.hallId = hall.id;
      masterData.gender = hallName === "male" ? "male" : "female";
    }

    if (login !== undefined && login !== master.user.login) {
      const existing = await prisma.user.findUnique({ where: { login } });
      if (existing) throw new HttpError(409, "login_already_taken");
      userData.login = login;
    }
    if (password !== undefined) userData.passwordHash = await bcrypt.hash(password, 10);
    if (phone !== undefined) {
      userData.phone = phone;
      masterData.phone = phone;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(masterData).length > 0) {
        await tx.master.update({ where: { id }, data: masterData });
      }
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: master.userId }, data: userData });
      }
      if (serviceIds !== undefined) {
        const targetHallId = masterData.hallId ?? master.hallId;
        const services = await tx.service.findMany({
          where: { id: { in: serviceIds }, hallId: targetHallId, isActive: true },
        });
        if (services.length !== serviceIds.length) throw new HttpError(400, "invalid_services_for_hall");
        await tx.masterService.deleteMany({ where: { masterId: id } });
        await tx.masterService.createMany({ data: serviceIds.map((sid) => ({ masterId: id, serviceId: sid })) });
      }
    });

    const updated = await prisma.master.findUnique({
      where: { id },
      include: { user: true, hall: true, services: { include: { service: true } } },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/masters/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({ where: { id } });
    if (!master) return res.status(404).json({ error: "not_found" });
    const userId = master.userId;
    await prisma.$transaction(async (tx) => {
      await tx.review.deleteMany({ where: { masterId: id } });
      await tx.careRecommendation.deleteMany({ where: { createdById: id } });
      await tx.master.delete({ where: { id } });
      await tx.user.delete({ where: { id: userId } });
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/masters/photo", photoUpload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  const url = `/uploads/masters/${req.file.filename}`;
  res.json({ url });
});

const scheduleSchema = z.record(
  z.string(),
  z.union([
    z.null(),
    z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  ])
);

router.get("/masters/:id/schedule", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({ where: { id }, select: { workSchedule: true } });
    if (!master) throw new HttpError(404, "master_not_found");
    res.json(master.workSchedule || {});
  } catch (e) { next(e); }
});

router.put("/masters/:id/schedule", validateBody(scheduleSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({ where: { id } });
    if (!master) throw new HttpError(404, "master_not_found");
    const updated = await prisma.master.update({
      where: { id },
      data: { workSchedule: req.body },
    });
    res.json(updated.workSchedule);
  } catch (e) { next(e); }
});

// ===========================================================
// Расписание дня
// ===========================================================
router.get("/schedule", async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const items = await prisma.appointment.findMany({
      where: { startsAt: { gte: day, lt: dayEnd } },
      include: { client: true, master: true, service: true },
      orderBy: { startsAt: "asc" },
    });
    res.json(items);
  } catch (e) { next(e); }
});

// ===========================================================
// Отчёты руководителя — все 6 из задания
// ===========================================================
router.get("/reports/daily", async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const grouped = await prisma.appointment.groupBy({
      by: ["masterId"],
      where: { startsAt: { gte: day, lt: dayEnd }, status: { in: ["completed", "confirmed"] } },
      _count: { _all: true },
    });
    const masters = await prisma.master.findMany({ where: { id: { in: grouped.map((g) => g.masterId) } } });

    res.json(grouped.map((g) => ({
      masterId: g.masterId,
      masterName: masters.find((m) => m.id === g.masterId)?.fullName,
      clients: g._count._all,
    })));
  } catch (e) { next(e); }
});

router.get("/reports/earnings", async (req, res, next) => {
  try {
    const masterId = req.query.master_id ? Number(req.query.master_id) : undefined;
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const sum = await prisma.appointment.aggregate({
      where: { masterId, startsAt: { gte: day, lt: dayEnd }, status: "completed" },
      _sum: { priceAtBooking: true, discountApplied: true },
    });
    res.json({
      masterId: masterId || null,
      gross: Number(sum._sum.priceAtBooking || 0),
      discount: Number(sum._sum.discountApplied || 0),
      net: Number(sum._sum.priceAtBooking || 0) - Number(sum._sum.discountApplied || 0),
    });
  } catch (e) { next(e); }
});

router.get("/reports/top-service", async (_req, res, next) => {
  try {
    const grouped = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { status: "completed" },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 10,
    });
    const services = await prisma.service.findMany({ where: { id: { in: grouped.map((g) => g.serviceId) } } });
    res.json(grouped.map((g) => ({
      serviceId: g.serviceId,
      name: services.find((s) => s.id === g.serviceId)?.name,
      count: g._count._all,
    })));
  } catch (e) { next(e); }
});

router.get("/reports/gender-ratio", async (_req, res, next) => {
  try {
    const grouped = await prisma.client.groupBy({
      by: ["gender"],
      _count: { _all: true },
    });
    const total = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const result = { male: 0, female: 0, total };
    for (const g of grouped) result[g.gender] = g._count._all;
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/reports/regulars-count", async (_req, res, next) => {
  try {
    const total = await prisma.client.count();
    const regular = await prisma.client.count({ where: { category: "regular" } });
    res.json({ total, regular, casual: total - regular });
  } catch (e) { next(e); }
});

router.get("/reports/top-master", async (_req, res, next) => {
  try {
    const grouped = await prisma.appointment.groupBy({
      by: ["masterId"],
      where: { status: "completed" },
      _count: { _all: true },
      orderBy: { _count: { masterId: "desc" } },
      take: 10,
    });
    const masters = await prisma.master.findMany({ where: { id: { in: grouped.map((g) => g.masterId) } } });
    res.json(grouped.map((g) => ({
      masterId: g.masterId,
      name: masters.find((m) => m.id === g.masterId)?.fullName,
      count: g._count._all,
    })));
  } catch (e) { next(e); }
});

// ===========================================================
// Услуги (CRUD)
// ===========================================================
router.get("/services", async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      include: { hall: true },
      orderBy: [{ hallId: "asc" }, { name: "asc" }],
    });
    res.json(services);
  } catch (e) { next(e); }
});

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().positive(),
  durationMin: z.number().int().min(5).max(480),
  hallName: z.enum(["male", "female"]),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

router.post("/services", validateBody(serviceSchema), async (req, res, next) => {
  try {
    const { name, price, durationMin, hallName, category, description } = req.body;
    const hall = await prisma.hall.findUnique({ where: { name: hallName } });
    if (!hall) throw new HttpError(400, "hall_not_found");
    const service = await prisma.service.create({
      data: { name, price, durationMin, hallId: hall.id, category: category || null, description: description || null },
      include: { hall: true },
    });
    res.status(201).json(service);
  } catch (e) { next(e); }
});

router.patch("/services/:id", validateBody(serviceSchema.partial()), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) throw new HttpError(404, "service_not_found");

    const data = {};
    const { name, price, durationMin, hallName, category, description } = req.body;
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (durationMin !== undefined) data.durationMin = durationMin;
    if (category !== undefined) data.category = category || null;
    if (description !== undefined) data.description = description || null;
    if (hallName !== undefined) {
      const hall = await prisma.hall.findUnique({ where: { name: hallName } });
      if (!hall) throw new HttpError(400, "hall_not_found");
      data.hallId = hall.id;
    }

    const updated = await prisma.service.update({ where: { id }, data, include: { hall: true } });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/services/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) return res.status(404).json({ error: "not_found" });
    await prisma.service.update({ where: { id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
