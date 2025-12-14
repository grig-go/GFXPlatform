// PlaylistCalendar - Calendar view for playlist scheduling
"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, Image, FileText, Folder, X, Play, Repeat, CalendarDays, Video, Music, Layout, Tv, Sparkles, ArrowLeft, Search, Filter } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import type { PlaylistItem, PlaylistWithItems, ScheduleConfig, DayOfWeek } from '../types/playlist';

interface CalendarEvent {
  id: string;
  item: PlaylistItem;
  date: Date;
  startTime?: string;
  endTime?: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
}

interface PlaylistCalendarProps {
  playlist: PlaylistWithItems | null;
  onClose: () => void;
  onPlayItem?: (item: PlaylistItem) => void;
}

type ViewMode = 'month' | 'day';

// Day keys for translation
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Month keys for translation
const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// Color palette for events
const EVENT_COLORS = [
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'text-amber-500' },
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'text-blue-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'text-purple-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'text-emerald-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'text-rose-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'text-cyan-500' },
];

function getItemColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function ItemIcon({ type, mediaType, className = "h-3 w-3" }: { type: string; mediaType?: string; className?: string }) {
  // Check media type first for more specific icons
  if (mediaType) {
    const mt = mediaType.toLowerCase();
    if (mt === 'video' || mt.includes('video')) return <Video className={className} />;
    if (mt === 'image' || mt.includes('image')) return <Image className={className} />;
    if (mt === 'audio' || mt.includes('audio')) return <Music className={className} />;
    if (mt === 'graphic' || mt === 'graphics' || mt.includes('graphic')) return <Sparkles className={className} />;
    if (mt === 'ticker' || mt.includes('ticker')) return <Tv className={className} />;
    if (mt === 'layout' || mt.includes('layout')) return <Layout className={className} />;
  }

  // Fall back to item type
  switch (type) {
    case 'page':
      return <FileText className={className} />;
    case 'group':
      return <Folder className={className} />;
    case 'media':
      return <Image className={className} />;
    default:
      return <FileText className={className} />;
  }
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

function formatTime12(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// Generate calendar grid for a given month
function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const days: Date[] = [];

  // Previous month days
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthDays - i));
  }

  // Current month days
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Next month days to fill 6 rows (42 cells)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// Media type filter options (labelKey for translation)
const MEDIA_TYPE_FILTERS = [
  { value: 'all', labelKey: 'calendar.filters.allTypes', icon: Filter },
  { value: 'video', labelKey: 'calendar.filters.video', icon: Video },
  { value: 'image', labelKey: 'calendar.filters.image', icon: Image },
  { value: 'audio', labelKey: 'calendar.filters.audio', icon: Music },
  { value: 'graphic', labelKey: 'calendar.filters.graphics', icon: Sparkles },
  { value: 'ticker', labelKey: 'calendar.filters.ticker', icon: Tv },
  { value: 'layout', labelKey: 'calendar.filters.layout', icon: Layout },
];

export function PlaylistCalendar({ playlist, onClose, onPlayItem }: PlaylistCalendarProps) {
  const { t, i18n } = useTranslation('playlist');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');

  // Get current locale for date formatting
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Generate calendar grid
  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  // Generate calendar events from playlist items
  const calendarEvents = useMemo(() => {
    if (!playlist?.items) return [];

    const events: CalendarEvent[] = [];
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);

    playlist.items.forEach((item, itemIndex) => {
      const scheduleConfig = item.metadata?.schedule_config as ScheduleConfig | undefined;
      const colorSet = getItemColor(itemIndex);

      if (!scheduleConfig?.enabled) {
        if (item.scheduled_time) {
          const scheduledDate = new Date(item.scheduled_time);
          if (scheduledDate >= startDate && scheduledDate <= endDate) {
            events.push({
              id: `${item.id}-${scheduledDate.toISOString()}`,
              item,
              date: scheduledDate,
              startTime: scheduledDate.toTimeString().slice(0, 5),
              bgColor: colorSet.bg,
              textColor: colorSet.text,
              dotColor: colorSet.dot,
            });
          }
        }
        return;
      }

      const { ruleType, daysOfWeek, specificDates, startDate: configStartDate, endDate: configEndDate, timeWindows, exclusionDates } = scheduleConfig;
      const scheduleStart = configStartDate ? new Date(configStartDate) : startDate;
      const scheduleEnd = configEndDate ? new Date(configEndDate) : endDate;
      const effectiveStart = new Date(Math.max(startDate.getTime(), scheduleStart.getTime()));
      const effectiveEnd = new Date(Math.min(endDate.getTime(), scheduleEnd.getTime()));

      for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (exclusionDates?.includes(dateStr)) continue;

        let shouldAdd = false;
        const dayOfWeek = d.getDay();

        switch (ruleType) {
          case 'daily':
            shouldAdd = true;
            break;
          case 'weekly':
            if (daysOfWeek) {
              const dayName = FULL_DAYS[dayOfWeek].toLowerCase() as DayOfWeek;
              shouldAdd = daysOfWeek.includes(dayName);
            }
            break;
          case 'specific_dates':
            shouldAdd = specificDates?.includes(dateStr) || false;
            break;
          case 'date_range':
            shouldAdd = true;
            break;
        }

        if (shouldAdd) {
          if (timeWindows && timeWindows.length > 0) {
            timeWindows.forEach((window, windowIndex) => {
              events.push({
                id: `${item.id}-${dateStr}-${windowIndex}`,
                item,
                date: new Date(d),
                startTime: window.start,
                endTime: window.end,
                bgColor: colorSet.bg,
                textColor: colorSet.text,
                dotColor: colorSet.dot,
              });
            });
          } else {
            events.push({
              id: `${item.id}-${dateStr}`,
              item,
              date: new Date(d),
              bgColor: colorSet.bg,
              textColor: colorSet.text,
              dotColor: colorSet.dot,
            });
          }
        }
      }
    });

    return events;
  }, [playlist, year, month]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = event.item.name.toLowerCase().includes(query);
        const typeMatch = event.item.media_type?.toLowerCase().includes(query);
        if (!nameMatch && !typeMatch) return false;
      }

      // Media type filter
      if (mediaTypeFilter !== 'all') {
        const itemMediaType = (event.item.media_type || event.item.item_type || '').toLowerCase();
        if (!itemMediaType.includes(mediaTypeFilter)) return false;
      }

      return true;
    });
  }, [calendarEvents, searchQuery, mediaTypeFilter]);

  const eventCount = useMemo(() => {
    return filteredEvents.filter(e =>
      e.date.getMonth() === month && e.date.getFullYear() === year
    ).length;
  }, [filteredEvents, month, year]);

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return filteredEvents.filter(e =>
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
    );
  }, [filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getEventsForDate(selectedDay).sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [selectedDay, getEventsForDate]);

  const clearFilters = () => {
    setSearchQuery('');
    setMediaTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || mediaTypeFilter !== 'all';

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setViewMode('day');
  };

  const handleBackToMonth = () => {
    setViewMode('month');
  };

  const handlePrevDay = () => {
    if (selectedDay) {
      const prev = new Date(selectedDay);
      prev.setDate(prev.getDate() - 1);
      setSelectedDay(prev);
      // Update month if needed
      if (prev.getMonth() !== month) {
        setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDay) {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 1);
      setSelectedDay(next);
      // Update month if needed
      if (next.getMonth() !== month) {
        setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    }
  };

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  const isCurrentMonth = (date: Date) => date.getMonth() === month;

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b">
        <div className="flex items-center gap-3">
          {viewMode === 'day' ? (
            <>
              <Button variant="outline" size="sm" onClick={handleBackToMonth} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                {t('calendar.back')}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold text-lg min-w-[220px] text-center">
                {selectedDay?.toLocaleDateString(locale, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="font-semibold text-lg min-w-[180px] text-center">
                {t(`calendar.months.${MONTH_KEYS[month]}`)} {year}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {viewMode === 'day'
              ? t('calendar.events', { count: selectedDayEvents.length })
              : t('calendar.scheduledThisMonth', { count: eventCount })
            }
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-2 flex items-center gap-3 border-b bg-muted/30 flex-shrink-0">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('search.searchEvents')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Media Type Filter Buttons */}
        <div className="flex items-center gap-1">
          {MEDIA_TYPE_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = mediaTypeFilter === filter.value;
            return (
              <Button
                key={filter.value}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setMediaTypeFilter(filter.value)}
                className={cn(
                  "h-8 gap-1.5",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(filter.labelKey)}</span>
              </Button>
            );
          })}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t('calendar.clear')}
          </Button>
        )}
      </div>

      {/* View Content */}
      {viewMode === 'month' ? (
        /* Month View */
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <div className="h-full border rounded-lg overflow-hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'auto repeat(6, 1fr)' }}>
          {/* Day Headers */}
          {DAY_KEYS.map((dayKey) => (
            <div key={dayKey} className="py-2 text-center text-sm font-medium text-muted-foreground border-b">
              {t(`calendar.days.${dayKey}`)}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            const events = getEventsForDate(date);
            const sortedEvents = [...events].sort((a, b) => {
              if (!a.startTime && !b.startTime) return 0;
              if (!a.startTime) return 1;
              if (!b.startTime) return -1;
              return a.startTime.localeCompare(b.startTime);
            });
            const isOutside = !isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "border-b border-r p-1.5 flex flex-col overflow-hidden cursor-pointer min-h-0 group/day",
                  "transition-all duration-200 ease-out",
                  "hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]",
                  "hover:scale-[1.02] hover:z-10",
                  isOutside && "bg-muted/10",
                  index % 7 === 0 && "border-l"
                )}
                onClick={() => handleDayClick(date)}
              >
                {/* Date number */}
                <div className={cn(
                  "text-sm font-medium mb-0.5 flex-shrink-0 transition-all duration-200",
                  isOutside && "text-muted-foreground/40",
                  isTodayDate && "text-blue-600 font-semibold",
                  "group-hover/day:text-blue-600 group-hover/day:scale-110 group-hover/day:translate-x-0.5"
                )}>
                  {date.getDate()}
                </div>

                {/* Events */}
                <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-h-0">
                  {sortedEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      className="flex items-center gap-1 text-xs py-0.5 px-1.5 rounded cursor-pointer truncate flex-shrink-0 text-foreground transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-md hover:translate-x-0.5 active:scale-[0.98]"
                      style={{
                        backgroundColor: 'rgb(209, 213, 219)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(191, 219, 254)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(209, 213, 219)';
                      }}
                    >
                      <span className={cn("flex-shrink-0", event.dotColor)}>
                        <ItemIcon type={event.item.item_type} mediaType={event.item.media_type} className="h-3 w-3" />
                      </span>
                      <span className="truncate text-muted-foreground">{event.startTime ? formatTime(event.startTime) : event.item.name}</span>
                    </div>
                  ))}
                  {sortedEvents.length > 3 && (
                    <div
                      className="text-xs text-blue-600 font-medium px-1 flex-shrink-0 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayClick(date);
                      }}
                    >
                      {t('calendar.more', { count: sortedEvents.length - 3 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* Day View */
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <div className="h-full border rounded-lg flex flex-col overflow-hidden">
          {/* Day view header */}
          <div className="p-4 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {selectedDay?.toLocaleDateString(locale, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('calendar.scheduledEvents', { count: selectedDayEvents.length })}
                </p>
              </div>
              {selectedDay && isToday(selectedDay) && (
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {t('calendar.today')}
                </span>
              )}
            </div>
          </div>

          {/* Events list - scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{t('calendar.noEventsDay')}</p>
              </div>
            ) : (
              selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setEventDetailOpen(true);
                  }}
                  className="w-full text-left p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-150 hover:shadow-sm border border-transparent hover:border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-background", event.dotColor)}>
                      <ItemIcon type={event.item.item_type} mediaType={event.item.media_type} className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {event.item.name}
                      </div>
                      {event.startTime && (
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime12(event.startTime)}
                          {event.endTime && ` - ${formatTime12(event.endTime)}`}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground/70 mt-1 capitalize flex items-center gap-2">
                        <span>{event.item.media_type || event.item.item_type}</span>
                        <span>•</span>
                        <span>{formatDuration(event.item.duration)}</span>
                      </div>
                    </div>
                    {onPlayItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayItem(event.item);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          </div>
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn("text-lg", selectedEvent?.dotColor)}>●</span>
              {selectedEvent?.item.name}
            </DialogTitle>
            <DialogDescription>
              {t('calendar.scheduledFor', { date: selectedEvent?.date.toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedEvent?.item.media_thumbnail && (
              <div className="rounded-lg overflow-hidden border bg-muted">
                <img
                  src={selectedEvent.item.media_thumbnail}
                  alt={selectedEvent.item.name}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{t('calendar.time')}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEvent?.startTime ? (
                      <>
                        {formatTime12(selectedEvent.startTime)}
                        {selectedEvent.endTime && ` - ${formatTime12(selectedEvent.endTime)}`}
                      </>
                    ) : t('calendar.allDay')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{t('calendar.duration')}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDuration(selectedEvent?.item.duration || 0)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <ItemIcon type={selectedEvent?.item.item_type || 'media'} className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{t('calendar.type')}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {selectedEvent?.item.item_type}
                    {selectedEvent?.item.media_type && ` (${selectedEvent.item.media_type})`}
                  </div>
                </div>
              </div>

              {selectedEvent?.item.channel_name && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('calendar.channel')}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedEvent.item.channel_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDetailOpen(false)}>
              {t('calendar.close')}
            </Button>
            {onPlayItem && selectedEvent && (
              <Button onClick={() => {
                onPlayItem(selectedEvent.item);
                setEventDetailOpen(false);
              }}>
                <Play className="h-4 w-4 mr-1 fill-white" />
                {t('calendar.playNow')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlaylistCalendar;
