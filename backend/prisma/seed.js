/**
 * ATELIER — заполнение базы тестовыми данными.
 * Создаёт: 3 пользователей (user/master/admin), 2 зала, 8 услуг, 6 мастеров,
 * несколько демо-записей с историей и советами по уходу.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

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
  const services = await Promise.all([
    prisma.service.create({ data: { name: "Стрижка мужская", hallId: maleHall.id, price: 800, durationMin: 45 } }),
    prisma.service.create({ data: { name: "Модная стрижка", hallId: maleHall.id, price: 1500, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Моделирование бороды", hallId: maleHall.id, price: 700, durationMin: 30 } }),
    prisma.service.create({ data: { name: "Стрижка женская", hallId: femaleHall.id, price: 1800, durationMin: 60 } }),
    prisma.service.create({ data: { name: "Окрашивание в один тон", hallId: femaleHall.id, price: 3500, durationMin: 120 } }),
    prisma.service.create({ data: { name: "Сложное окрашивание (балаяж)", hallId: femaleHall.id, price: 6800, durationMin: 180 } }),
    prisma.service.create({ data: { name: "Маникюр с покрытием", hallId: femaleHall.id, price: 1800, durationMin: 90 } }),
    prisma.service.create({ data: { name: "Уход Olaplex", hallId: femaleHall.id, price: 1600, durationMin: 45 } }),
  ]);

  const password = (s) => bcrypt.hash(s, 10);

  // Пользователи: тестовые аккаунты
  const userClient = await prisma.user.create({
    data: {
      login: "user",
      email: "user@atelier.local",
      phone: "+7 (999) 111-22-33",
      passwordHash: await password("user"),
      role: "client",
      client: {
        create: {
          fullName: "Анна Петрова",
          gender: "female",
          category: "regular",
          discountPercent: 10,
          phone: "+7 (999) 111-22-33",
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
          bio: "Колорист с опытом более 8 лет. Специализация — балаяж, airtouch, восстановление.",
          avatarUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600",
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
      bio: "Мастер маникюра и дизайна ногтей.",
      avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600",
      averageRating: 4.8,
    },
    {
      login: "ivan.s",
      fullName: "Иван Сидоров",
      gender: "male",
      hallId: maleHall.id,
      rank: 5,
      experienceYears: 5,
      bio: "Барбер, точная работа машинкой и ножницами.",
      avatarUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600",
      averageRating: 4.7,
    },
    {
      login: "maria.n",
      fullName: "Мария Новикова",
      gender: "female",
      hallId: femaleHall.id,
      rank: 5,
      experienceYears: 9,
      bio: "Стрижки и укладки, индивидуальный подбор формы.",
      avatarUrl: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600",
      averageRating: 4.9,
    },
    {
      login: "elena.o",
      fullName: "Елена Орлова",
      gender: "female",
      hallId: femaleHall.id,
      rank: 4,
      experienceYears: 7,
      bio: "Косметолог-эстетист, чистки и уход за лицом.",
      avatarUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600",
      averageRating: 4.8,
    },
    {
      login: "dmitriy.v",
      fullName: "Дмитрий Волков",
      gender: "male",
      hallId: maleHall.id,
      rank: 4,
      experienceYears: 4,
      bio: "Барбер, моделирование бороды и стрижка машинкой.",
      avatarUrl: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600",
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
  const allMasters = [userMaster.master, ...createdMasters];
  const link = (master, serviceIdx) =>
    prisma.masterService.create({
      data: { masterId: master.id, serviceId: services[serviceIdx].id },
    });

  await link(userMaster.master, 3); // стрижка ж
  await link(userMaster.master, 4); // окрашивание
  await link(userMaster.master, 5); // балаяж
  await link(userMaster.master, 7); // Olaplex

  await link(createdMasters[0], 6); // маникюр
  await link(createdMasters[1], 0); // стрижка м
  await link(createdMasters[1], 1); // модная
  await link(createdMasters[2], 3); // стрижка ж
  await link(createdMasters[2], 7); // Olaplex
  await link(createdMasters[3], 4); // окрашивание
  await link(createdMasters[4], 0); // стрижка м
  await link(createdMasters[4], 2); // борода

  // Пара случайных клиентов для админ-панели
  for (let i = 0; i < 5; i++) {
    const login = `client_${i + 1}`;
    await prisma.user.create({
      data: {
        login,
        email: `${login}@atelier.local`,
        passwordHash: await password(login),
        role: "client",
        client: {
          create: {
            fullName: ["Мария Иванова", "Дмитрий Соколов", "Светлана Морозова", "Иван Петров", "Елена Новикова"][i],
            gender: i % 2 === 0 ? "female" : "male",
            category: i < 3 ? "regular" : "casual",
            discountPercent: i < 3 ? 10 : 0,
            phone: `+7 (925) 444-55-${String(60 + i).padStart(2, "0")}`,
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
      serviceId: services[5].id, // балаяж
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
      serviceId: services[5].id,
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
