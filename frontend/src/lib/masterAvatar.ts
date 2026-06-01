/** Локальные портреты мастеров (public/images/masters). */
export const MASTER_AVATARS_BY_NAME: Record<string, string> = {
  "Ольга Кузнецова": "/images/masters/olga-kuznetsova.png",
  "Ольга Соколова": "/images/masters/olga-sokolova.png",
  "Иван Сидоров": "/images/masters/ivan-sidorov.png",
  "Мария Новикова": "/images/masters/maria-novikova.png",
  "Елена Орлова": "/images/masters/elena-orlova.png",
  "Дмитрий Волков": "/images/masters/dmitriy-volkov.png",
};

export function getMasterAvatarUrl(master: { fullName: string; avatarUrl?: string | null }) {
  if (master.avatarUrl) return master.avatarUrl;
  return MASTER_AVATARS_BY_NAME[master.fullName] ?? "";
}
