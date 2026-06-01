import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addCalendarDays,
  calendarDayOfWeek,
  minutesToTime,
  mondayOfWeek,
  salonDateKey,
  salonTodayKey,
  SALON_DAY_END,
  SALON_DAY_START,
  utcToSalonLocal,
  weekDaysFromMonday,
} from "@/lib/salonTime";
import { classNames } from "@/lib/utils";
import { appointmentStatusLabel } from "@/lib/appointmentStatus";

const HOUR_HEIGHT = 56;
const GRID_HOURS = (SALON_DAY_END - SALON_DAY_START) / 60;
const GRID_HEIGHT = GRID_HOURS * HOUR_HEIGHT;

const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

interface Appointment {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  client?: { fullName: string };
  service?: { name: string; durationMin?: number };
}

interface MasterWeekCalendarProps {
  appointments: Appointment[];
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-500/90 border-blue-600 text-white",
  confirmed: "bg-emerald-600/90 border-emerald-700 text-white",
  completed: "bg-ink-400/80 border-ink-500 text-white",
  no_show: "bg-amber-500/90 border-amber-600 text-white",
  service_refused: "bg-orange-500/90 border-orange-600 text-white",
};

export function MasterWeekCalendar({ appointments }: MasterWeekCalendarProps) {
  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeek(salonTodayKey()));
  const todayKey = salonTodayKey();

  const days = useMemo(() => weekDaysFromMonday(weekMonday), [weekMonday]);
  const weekEnd = days[6];

  const weekAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (a.status === "cancelled") return false;
      const key = salonDateKey(a.startsAt);
      return key >= weekMonday && key <= weekEnd;
    });
  }, [appointments, weekMonday, weekEnd]);

  const nowLine = useMemo(() => {
    const now = new Date();
    const local = utcToSalonLocal(now);
    const todayInWeek = days.includes(salonDateKey(now));
    if (!todayInWeek) return null;
    const minutes = local.totalMinutes;
    if (minutes < SALON_DAY_START || minutes > SALON_DAY_END) return null;
    return ((minutes - SALON_DAY_START) / 60) * HOUR_HEIGHT;
  }, [days]);

  const hourLabels = Array.from({ length: GRID_HOURS + 1 }, (_, i) => SALON_DAY_START + i * 60);

  function prevWeek() {
    setWeekMonday((m) => addCalendarDays(m, -7)!);
  }

  function nextWeek() {
    setWeekMonday((m) => addCalendarDays(m, 7)!);
  }

  function goToday() {
    setWeekMonday(mondayOfWeek(todayKey));
  }

  const monthLabel = formatWeekRange(days[0], days[6]);

  return (
    <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday} className="btn-secondary text-xs py-1.5 px-3">
            Сегодня
          </button>
          <button type="button" onClick={prevWeek} className="w-8 h-8 rounded-full hover:bg-cream-100 text-ink-500" aria-label="Предыдущая неделя">
            ‹
          </button>
          <button type="button" onClick={nextWeek} className="w-8 h-8 rounded-full hover:bg-cream-100 text-ink-500" aria-label="Следующая неделя">
            ›
          </button>
          <span className="font-display text-xl text-ink-700 ml-2 capitalize">{monthLabel}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Заголовки дней */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-cream-200">
            <div className="border-r border-cream-100" />
            {days.map((dayKey) => {
              const [, , day] = dayKey.split("-").map(Number);
              const dow = calendarDayOfWeek(dayKey) ?? 0;
              const isToday = dayKey === todayKey;
              return (
                <div
                  key={dayKey}
                  className={classNames(
                    "py-2 text-center border-r border-cream-100 last:border-r-0",
                    isToday && "bg-cream-50",
                  )}
                >
                  <div className="text-[10px] uppercase tracking-widest text-ink-400">{WEEKDAY_SHORT[dow]}</div>
                  <div
                    className={classNames(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full mt-0.5 font-display text-lg",
                      isToday ? "bg-ink-700 text-cream-50" : "text-ink-700",
                    )}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Сетка времени */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Ось времени */}
            <div className="relative border-r border-cream-200" style={{ height: GRID_HEIGHT }}>
              {hourLabels.slice(0, -1).map((min, i) => (
                <div
                  key={min}
                  className="absolute right-2 text-[10px] text-ink-400 -translate-y-1/2 tabular-nums"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  {minutesToTime(min)}
                </div>
              ))}
            </div>

            {/* Колонки дней */}
            {days.map((dayKey) => {
              const dayAppts = weekAppointments.filter((a) => salonDateKey(a.startsAt) === dayKey);
              const isToday = dayKey === todayKey;

              return (
                <div
                  key={dayKey}
                  className={classNames(
                    "relative border-r border-cream-100 last:border-r-0",
                    isToday && "bg-cream-50/50",
                  )}
                  style={{ height: GRID_HEIGHT }}
                >
                  {/* Горизонтальные линии часов */}
                  {hourLabels.slice(0, -1).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-cream-100"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Текущее время */}
                  {isToday && nowLine !== null && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowLine }}>
                      <div className="relative">
                        <div className="absolute -left-1 w-2 h-2 rounded-full bg-red-500 -translate-y-1/2" />
                        <div className="border-t-2 border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Блоки записей */}
                  {dayAppts.map((a) => {
                    const start = utcToSalonLocal(new Date(a.startsAt));
                    const end = utcToSalonLocal(new Date(a.endsAt));
                    const top = ((start.totalMinutes - SALON_DAY_START) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((end.totalMinutes - start.totalMinutes) / 60) * HOUR_HEIGHT, 28);
                    const color = STATUS_COLORS[a.status] ?? "bg-ink-500/90 border-ink-600 text-white";

                    if (start.totalMinutes >= SALON_DAY_END || end.totalMinutes <= SALON_DAY_START) return null;

                    return (
                      <Link
                        key={a.id}
                        to={`/master/appointments/${a.id}`}
                        className={classNames(
                          "absolute left-0.5 right-0.5 z-10 rounded-md border px-1.5 py-1 overflow-hidden",
                          "hover:brightness-110 hover:shadow-md transition",
                          color,
                        )}
                        style={{ top: Math.max(0, top), height }}
                        title={`${a.client?.fullName} · ${a.service?.name}`}
                      >
                        <div className="text-[11px] font-semibold leading-tight truncate">
                          {a.client?.fullName ?? "Клиент"}
                        </div>
                        <div className="text-[10px] leading-tight opacity-90 truncate mt-0.5">
                          {a.service?.name ?? "Услуга"}
                        </div>
                        {height >= 44 && (
                          <div className="text-[9px] opacity-75 mt-0.5 tabular-nums">
                            {minutesToTime(start.totalMinutes)}–{minutesToTime(end.totalMinutes)}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-cream-100 flex flex-wrap gap-3 text-[10px] text-ink-400">
        {(["planned", "confirmed", "completed", "no_show", "service_refused"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={classNames("w-2.5 h-2.5 rounded-sm", STATUS_COLORS[s]?.split(" ")[0])} />
            {appointmentStatusLabel(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatWeekRange(startKey: string, endKey: string) {
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  if (sm === em && sy === ey) return `${sd}–${ed} ${months[sm - 1]} ${sy}`;
  if (sy === ey) return `${sd} ${months[sm - 1]} – ${ed} ${months[em - 1]} ${sy}`;
  return `${sd} ${months[sm - 1]} ${sy} – ${ed} ${months[em - 1]} ${ey}`;
}
