'use client';

import React, { useMemo } from 'react';
import { FullCalendarEvent } from '@/types/event';
import { useTranslations } from 'next-intl';
import EventContent from '@/components/EventContent';

type Resource = {
  id: string;
  title: string;
  category: string;
};

interface TimelineCalendarProps {
  events: FullCalendarEvent[];
  resources: Resource[];
  currentDate: Date;
  locale: string;
  showNowIndicator?: boolean;
}

type EventWithComputedPosition = FullCalendarEvent & {
  leftPercent: number;
  widthPercent: number;
  status: 'expired' | 'ongoing' | 'upcoming';
};

function getDaysRange(startDate: Date, lengthDays = 30): { days: Date[]; start: Date; end: Date } {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + (lengthDays - 1));
  end.setHours(23, 59, 59, 999);

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return { days, start, end };
}

function formatDay(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric'
  }).format(date);
}

export const TimelineCalendar: React.FC<TimelineCalendarProps> = ({
  events,
  resources,
  currentDate,
  locale,
  showNowIndicator = true,
}) => {
  const t = useTranslations();
  const { days, start, end } = useMemo(() => getDaysRange(currentDate), [currentDate]);

  const totalMs = end.getTime() - start.getTime() || 1;
  const now = useMemo(() => new Date(), []);

  const eventsByResource = useMemo(() => {
    const map = new Map<string, EventWithComputedPosition[]>();

    for (const event of events) {
      const resourceId = event.resourceId;
      if (!resourceId) continue;

      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);

      // Clamp to current month view
      const clampedStart = new Date(Math.max(eventStart.getTime(), start.getTime()));
      const clampedEnd = new Date(Math.min(eventEnd.getTime(), end.getTime()));

      if (clampedEnd < start || clampedStart > end) {
        continue;
      }

      const leftPercent =
        ((clampedStart.getTime() - start.getTime()) / totalMs) * 100;
      const widthPercent =
        ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100 || (1 / days.length) * 100;

      let status: EventWithComputedPosition['status'] = 'upcoming';
      if (eventEnd < now) {
        status = 'expired';
      } else if (eventStart <= now && now <= eventEnd) {
        status = 'ongoing';
      }

      const enhanced: EventWithComputedPosition = {
        ...event,
        leftPercent,
        widthPercent,
        status,
      };

      if (!map.has(resourceId)) {
        map.set(resourceId, []);
      }
      map.get(resourceId)!.push(enhanced);
    }

    return map;
  }, [events, start, end, totalMs, days.length, now]);

  const resourcesByCategory = useMemo(() => {
    const grouped: Record<string, Resource[]> = {};
    for (const r of resources) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r);
    }
    return grouped;
  }, [resources]);

  const nowPositionPercent = useMemo(() => {
    if (!showNowIndicator) return null;
    if (now < start || now > end) return null;
    return ((now.getTime() - start.getTime()) / totalMs) * 100;
  }, [showNowIndicator, now, start, end, totalMs]);

  const viewTitle = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(currentDate);
  }, [currentDate, locale]);

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header: resources column + days */}
        <div className="flex border-b border-rule bg-surface">
          <div className="w-[15%] px-4 py-3 border-r border-rule text-xs font-semibold uppercase tracking-wide text-ink">
            {t('dashboard.products')}
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`px-2 py-2 text-center text-xs font-medium text-ink border-r border-rule ${
                  day.toDateString() === now.toDateString()
                    ? 'bg-accent-soft'
                    : (day.getDay() === 0 || day.getDay() === 6)
                    ? 'bg-surface-2'
                    : 'bg-surface-2'
                }`}
              >
                {formatDay(day, locale)}
              </div>
            ))}
          </div>
        </div>

        {/* Body: categories, resources, events */}
        <div className="relative">
          {/* Now indicator */}
          {nowPositionPercent !== null && (
            <div
              className="pointer-events-none absolute inset-y-0"
              style={{
                left: `calc(15% + ${nowPositionPercent} * 0.85%)`,
              }}
            >
              <div className="w-[2px] h-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
            </div>
          )}

          {Object.entries(resourcesByCategory).map(([category, resList]) => (
            <div key={category}>
              {/* Category row */}
              <div className="flex">
                <div className="w-[15%] px-4 py-2 border-r border-rule bg-surface text-xs font-semibold uppercase tracking-wide text-ink">
                  {category}
                </div>
                <div
                  className="flex-1 h-8 border-b border-rule bg-surface-2"
                  style={{ borderLeft: '1px solid rgba(79,70,229,0.4)' }}
                />
              </div>

              {/* Resources rows */}
              {resList.map((resource) => {
                const resourceEvents = eventsByResource.get(resource.id) || [];

                return (
                  <div key={resource.id} className="flex">
                    <div className="w-[15%] px-4 py-3 border-r border-rule bg-surface-2 text-sm font-medium text-ink truncate">
                      {resource.title}
                    </div>
                    <div
                      className="relative flex-1 h-16 border-b border-rule bg-surface-2"
                      style={{ borderLeft: '1px solid rgba(79,70,229,0.4)' }}
                    >
                      {/* Vertical day separators */}
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((day) => (
                          <div
                            key={day.toISOString()}
                            className="border-r border-rule"
                          />
                        ))}
                      </div>

                      {/* Events */}
                      <div className="relative h-full">
                        {resourceEvents.map((event) => {
                          const statusClass =
                            event.status === 'expired'
                              ? 'bg-violet-700'
                              : event.status === 'ongoing'
                              ? 'bg-emerald-600'
                              : 'bg-blue-600';

                          return (
                            <div
                              key={event.id}
                              className={`absolute top-1 bottom-1 rounded-md shadow-md overflow-hidden flex items-stretch cursor-pointer transition-transform hover:-translate-y-0.5`}
                              style={{
                                left: `${event.leftPercent}%`,
                                width: `${Math.max(event.widthPercent, 2)}%`,
                                borderColor: event.borderColor || 'rgba(15,23,42,0.8)',
                                borderWidth: 1,
                                borderStyle: 'solid',
                              }}
                            >
                              <div
                                className={`w-1 ${statusClass}`}
                              />
                              <div className="flex-1 min-w-0">
                                <EventContent event={event} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer with current view title (for cohérence UI) */}
        <div className="mt-4 text-sm text-ink-muted">
          {viewTitle}
        </div>
      </div>
    </div>
  );
};

export default TimelineCalendar;


