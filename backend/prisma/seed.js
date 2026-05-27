/**
 * ATELIER — заполнение базы тестовыми данными.
 * Создаёт: 3 пользователей (user/master/admin), 2 зала, 12 услуг, 6 мастеров,
 * несколько демо-записей с историей и советами по уходу.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Даты регистрации демо-клиентов (с 2016 года). */
const SEED_CLIENT_REGISTERED_AT = [
  new Date("2016-03-14T10:00:00"),
  new Date("2018-07-22T11:30:00"),
  new Date("2020-01-09T09:15:00"),
  new Date("2022-11-05T14:00:00"),
  new Date("2024-06-18T16:45:00"),
  new Date("2017-09-30T12:00:00"),
];

async function main() {
  console.log("🌱 Запуск seed…");

  // Очистка — для повторных запусков. Безопасно для разработки.
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.careRecommendation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.masterService.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.master.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.promoCode.deleteMany();

  // Залы
  const maleHall = await prisma.hall.create({
    data: { name: "male", description: "Мужской зал" },
  });
  const femaleHall = await prisma.hall.create({
    data: { name: "female", description: "Женский зал" },
  });

  // Услуги
  // Порядок создания = порядок в каталоге: стрижка → уход → окрашивание → маникюр → макияж
  const services = await Promise.all([
    prisma.service.create({ data: { name: "Стрижка мужская", hallId: maleHall.id, price: 800, durationMin: 45 } }),
    prisma.service.create({ data: { name: "Модная стрижка", hallId: maleHall.id, price: 1500, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Моделирование бороды", hallId: maleHall.id, price: 700, durationMin: 30 } }),
    prisma.service.create({ data: { name: "Стрижка женская", hallId: femaleHall.id, price: 1800, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Уход Olaplex", hallId: femaleHall.id, price: 1600, durationMin: 45 } }),
    prisma.service.create({ data: { name: "Окрашивание в один тон", hallId: femaleHall.id, price: 3500, durationMin: 120 } }),
    prisma.service.create({ data: { name: "Сложное окрашивание (балаяж)", hallId: femaleHall.id, price: 6800, durationMin: 180 } }),
    prisma.service.create({ data: { name: "Маникюр с покрытием", hallId: femaleHall.id, price: 1800, durationMin: 90 } }),
    prisma.service.create({ data: { name: "Маникюр без покрытия", hallId: femaleHall.id, price: 1200, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Макияж повседневный", hallId: femaleHall.id, price: 2500, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Макияж праздничный", hallId: femaleHall.id, price: 4000, durationMin: 90 } }),
    prisma.service.create({ data: { name: "Макияж свадебный", hallId: femaleHall.id, price: 6000, durationMin: 120 } }),
  ]);

  const serviceByName = Object.fromEntries(services.map((s) => [s.name, s]));

  const password = (s) => bcrypt.hash(s, 10);

  // Пользователи: тестовые аккаунты
  const userRegisteredAt = SEED_CLIENT_REGISTERED_AT[0];
  const userClient = await prisma.user.create({
    data: {
      login: "user",
      email: "user@atelier.local",
      phone: "+7 (999) 111-22-33",
      passwordHash: await password("user"),
      role: "client",
      createdAt: userRegisteredAt,
      client: {
        create: {
          fullName: "Анна Петрова",
          gender: "female",
          category: "regular",
          discountPercent: 10,
          phone: "+7 (999) 111-22-33",
          registeredAt: userRegisteredAt,
        },
      },
    },
    include: { client: true },
  });

  const userMaster = await prisma.user.create({
    data: {
      login: "master",
      email: "master@atelier.local",
      phone: "+7 (916) 222-33-44",
      passwordHash: await password("master"),
      role: "master",
      master: {
        create: {
          fullName: "Ольга Кузнецова",
          gender: "female",
          hallId: femaleHall.id,
          rank: 5,
          experienceYears: 8,
          bio: "Парикмахер-колорист: женские стрижки, окрашивание и балаяж, уход Olaplex.",
          specialties: ["Стрижка", "Окрашивание", "Уход за волосами"],
          avatarUrl: "/images/masters/olga-kuznetsova.png",
          socialLinks: { instagram: "@olga.color", telegram: "@olga_kuznetsova" },
          averageRating: 4.9,
          isActive: true,
        },
      },
    },
    include: { master: true },
  });

  const userAdmin = await prisma.user.create({
    data: {
      login: "admin",
      email: "admin@atelier.local",
      phone: "+7 (495) 123-45-67",
      passwordHash: await password("admin"),
      role: "admin",
    },
  });

  // Дополнительные мастера для каталога
  const otherMasters = [
    {
      login: "olga.s",
      fullName: "Ольга Соколова",
      gender: "female",
      hallId: femaleHall.id,
      rank: 4,
      experienceYears: 6,
      bio: "Мастер маникюра: с покрытием и без, классический и аппаратный уход.",
      specialties: ["Маникюр"],
      avatarUrl: "/images/masters/olga-sokolova.png",
      averageRating: 4.8,
    },
    {
      login: "ivan.s",
      fullName: "Иван Сидоров",
      gender: "male",
      hallId: maleHall.id,
      rank: 5,
      experienceYears: 5,
      bio: "Барбер: мужская и модная стрижка, работа машинкой и ножницами.",
      specialties: ["Стрижка"],
      avatarUrl: "/images/masters/ivan-sidorov.png",
      averageRating: 4.7,
    },
    {
      login: "maria.n",
      fullName: "Мария Новикова",
      gender: "female",
      hallId: femaleHall.id,
      rank: 5,
      experienceYears: 9,
      bio: "Парикмахер: женские стрижки и восстанавливающий уход Olaplex.",
      specialties: ["Стрижка", "Уход за волосами"],
      avatarUrl: "/images/masters/maria-novikova.png",
      averageRating: 4.9,
    },
    {
      login: "elena.o",
      fullName: "Елена Орлова",
      gender: "female",
      hallId: femaleHall.id,
      rank: 4,
      experienceYears: 7,
      bio: "Визажист: макияж повседневный, праздничный и свадебный.",
      specialties: ["Макияж"],
      avatarUrl: "/images/masters/elena-orlova.png",
      averageRating: 4.8,
    },
    {
      login: "dmitriy.v",
      fullName: "Дмитрий Волков",
      gender: "male",
      hallId: maleHall.id,
      rank: 4,
      experienceYears: 4,
      bio: "Барбер: мужская стрижка и моделирование бороды.",
      specialties: ["Стрижка", "Борода"],
      avatarUrl: "/images/masters/dmitriy-volkov.png",
      averageRating: 4.6,
    },
  ];

  const createdMasters = [];
  for (const m of otherMasters) {
    const u = await prisma.user.create({
      data: {
        login: m.login,
        email: `${m.login}@atelier.local`,
        passwordHash: await password(m.login),
        role: "master",
        master: { create: { ...m, login: undefined, isActive: true, socialLinks: {} } },
      },
      include: { master: true },
    });
    createdMasters.push(u.master);
  }

  // Связь мастеров с услугами (master_services)
  const link = (master, serviceName) =>
    prisma.masterService.create({
      data: { masterId: master.id, serviceId: serviceByName[serviceName].id },
    });

  const olgaKuznetsova = userMaster.master;
  const olgaSokolova = createdMasters[0];
  const ivanSidorov = createdMasters[1];
  const mariaNovikova = createdMasters[2];
  const elenaOrlova = createdMasters[3];
  const dmitriyVolkov = createdMasters[4];

  await link(olgaKuznetsova, "Стрижка женская");
  await link(olgaKuznetsova, "Окрашивание в один тон");
  await link(olgaKuznetsova, "Сложное окрашивание (балаяж)");
  await link(olgaKuznetsova, "Уход Olaplex");

  await link(olgaSokolova, "Маникюр с покрытием");
  await link(olgaSokolova, "Маникюр без покрытия");

  await link(ivanSidorov, "Стрижка мужская");
  await link(ivanSidorov, "Модная стрижка");

  await link(mariaNovikova, "Стрижка женская");
  await link(mariaNovikova, "Уход Olaplex");

  await link(elenaOrlova, "Макияж повседневный");
  await link(elenaOrlova, "Макияж праздничный");
  await link(elenaOrlova, "Макияж свадебный");

  await link(dmitriyVolkov, "Стрижка мужская");
  await link(dmitriyVolkov, "Моделирование бороды");

  // Пара случайных клиентов для админ-панели
  for (let i = 0; i < 5; i++) {
    const login = `client_${i + 1}`;
    const registeredAt = SEED_CLIENT_REGISTERED_AT[i + 1];
    await prisma.user.create({
      data: {
        login,
        email: `${login}@atelier.local`,
        passwordHash: await password(login),
        role: "client",
        createdAt: registeredAt,
        client: {
          create: {
            fullName: ["Мария Иванова", "Дмитрий Соколов", "Светлана Морозова", "Иван Петров", "Елена Новикова"][i],
            gender: i % 2 === 0 ? "female" : "male",
            category: i < 3 ? "regular" : "casual",
            discountPercent: i < 3 ? 10 : 0,
            phone: `+7 (925) 444-55-${String(60 + i).padStart(2, "0")}`,
            registeredAt,
          },
        },
      },
    });
  }

  // Демо-запись клиента user в прошлом — с советом по уходу
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);
  past.setHours(11, 0, 0, 0);
  const completed = await prisma.appointment.create({
    data: {
      clientId: userClient.client.id,
      masterId: userMaster.master.id,
      serviceId: serviceByName["Сложное окрашивание (балаяж)"].id,
      startsAt: past,
      endsAt: new Date(past.getTime() + 180 * 60 * 1000),
      status: "completed",
      priceAtBooking: 6800,
      discountApplied: 680,
    },
  });
  await prisma.careRecommendation.create({
    data: {
      appointmentId: completed.id,
      adviceText:
        "Безсульфатный шампунь, маска для окрашенных волос 1 раз в неделю. UV-защита в солнечную погоду.",
      repeatAfterDays: 28,
      createdById: userMaster.master.id,
    },
  });

  // Демо-запись в будущем (для предстоящих визитов)
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
  future.setHours(10, 0, 0, 0);
  await prisma.appointment.create({
    data: {
      clientId: userClient.client.id,
      masterId: userMaster.master.id,
      serviceId: serviceByName["Сложное окрашивание (балаяж)"].id,
      startsAt: future,
      endsAt: new Date(future.getTime() + 180 * 60 * 1000),
      status: "confirmed",
      priceAtBooking: 6800,
      discountApplied: 680,
    },
  });

  console.log("✅ Seed завершён.");
  console.log("   Тестовые аккаунты: user/user · master/master · admin/admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
