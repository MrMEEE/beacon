export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description?: string;
  calendarId: string;
  calendarName: string;
  color: string;
  recurrence?: RecurrenceFrequency;
  recurrenceEnd?: string;
  /**
   * Whether this event has a real, stable UID from its calendar provider
   * (HA's `uid` or `recurrence_id`), as opposed to a synthetic composite
   * fallback id assigned client-side when the provider didn't return one.
   * `undefined` means "not applicable" (e.g. locally-stored Beacon events,
   * which always have a real, stable id). Only ever explicitly `false` for
   * HA-backed events without a usable uid — edit/delete should be blocked
   * against HA's calendar services in that case, since the fallback id
   * isn't a real event uid the service will recognize.
   */
  hasStableId?: boolean;
}

export interface CalendarInfo {
  id: string;
  name: string;
  color: string;
}

export interface WeatherData {
  temperature: number;
  temperatureUnit: string;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  condition: string;
  tempHigh: number;
  tempLow: number;
}

/* 4-category color set (Sage/Lavender/Coral/Teal) — see docs/design-tokens.md.
   Rose was cut (least distinguishable from Coral); Ocean/Soft-Blue merged into
   the primary accent, so it's not part of the category rotation. */
export const CALENDAR_COLORS: Record<number, string> = {
  0: '#10b981', // sage
  1: '#8b5cf6', // lavender
  2: '#f97316', // coral
  3: '#14b8a6', // teal
};

export function getCalendarColor(index: number): string {
  return CALENDAR_COLORS[index % Object.keys(CALENDAR_COLORS).length];
}

/* Maps a full-saturation calendar color to its pastel variant for event blocks */
const PASTEL_MAP: Record<string, string> = {
  '#10b981': '#bbf7d0', // sage
  '#8b5cf6': '#ddd6fe', // lavender
  '#f97316': '#fed7aa', // coral
  '#14b8a6': '#99f6e4', // teal
};

export function getPastelColor(fullColor: string): string {
  return PASTEL_MAP[fullColor] || '#e5e7eb';
}

export function getFullColor(fullColor: string): string {
  // If the color is already a known full color, return it
  if (PASTEL_MAP[fullColor]) return fullColor;
  // Fallback
  return '#6b7280';
}
