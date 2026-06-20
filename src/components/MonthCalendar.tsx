import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(month: Date): Date[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const grid: Date[] = [];
  for (let i = startWeekday; i > 0; i--) grid.push(new Date(year, m, 1 - i));
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, m, d));
  while (grid.length % 7 !== 0) grid.push(new Date(year, m, daysInMonth + (grid.length - startWeekday - daysInMonth + 1)));
  return grid;
}

export { dayKey };

export function MonthCalendar<T extends { id: string; scheduled_at: string }>({
  month,
  onMonthChange,
  events,
  renderEvent,
  onDayClick,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  events: T[];
  renderEvent: (event: T) => React.ReactNode;
  onDayClick?: (day: Date) => void;
}) {
  const grid = getMonthGrid(month);
  const today = new Date();

  const eventsByDay = new Map<string, T[]>();
  for (const ev of events) {
    const key = dayKey(new Date(ev.scheduled_at));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(ev);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* En-tête navigation */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <Button
          size="icon" variant="ghost" className="size-8"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold capitalize">
          {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <Button
          size="icon" variant="ghost" className="size-8"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
          return (
            <div
              key={i}
              onClick={() => onDayClick?.(day)}
              className={`min-h-[88px] border-b border-r border-border p-1.5 ${
                i % 7 === 6 ? "border-r-0" : ""
              } ${!inMonth ? "bg-muted/20" : ""} ${onDayClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
            >
              <span className={`inline-grid size-6 place-items-center rounded-full text-xs ${
                isToday ? "bg-primary text-primary-foreground font-semibold" : inMonth ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.map((ev) => renderEvent(ev))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
