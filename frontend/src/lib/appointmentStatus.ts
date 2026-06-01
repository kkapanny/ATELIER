/** Подписи итоговых статусов визита (мастер, админ, расписание). */
export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  planned: "Запланировано",
  confirmed: "Подтверждено",
  completed: "Услуга оказана",
  cancelled: "Отменено",
  no_show: "Клиент не явился",
  service_refused: "Отказано в услуге",
};

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

/** Итоги визита, которые мастер выбирает после завершения. */
export const MASTER_VISIT_OUTCOMES = [
  { value: "completed", label: "Услуга оказана", hint: "Клиент получил услугу" },
  { value: "service_refused", label: "Отказано в услуге", hint: "Услуга не была оказана" },
  { value: "no_show", label: "Клиент не явился", hint: "Клиент не пришёл на запись" },
] as const;

export type MasterVisitOutcome = (typeof MASTER_VISIT_OUTCOMES)[number]["value"];

export const UPCOMING_APPOINTMENT_STATUSES = ["planned", "confirmed"] as const;

export const FINAL_APPOINTMENT_STATUSES = ["completed", "no_show", "service_refused", "cancelled"] as const;
