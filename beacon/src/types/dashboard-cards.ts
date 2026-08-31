import type { ComponentType } from 'react';
import { CalendarEvent, WeatherData } from '../types';
import { Chore, FamilyMember } from './family';
import { DayMenu } from './meals';

export interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
}

export type CardSize = 'sm' | 'md' | 'lg';

export type DashboardRegion = 'topbar' | 'main' | 'sidebar';

/** Grid position/size in the main region's GridStack grid (12 columns). */
export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A single card placed in a dashboard region. */
export interface DashboardCard {
  id: string;
  type: string;
  /** Used by list regions (sidebar/topbar) for min-height sizing. */
  size: CardSize;
  /** Used by the main region's GridStack grid. Absent for list-region cards. */
  layout?: GridPosition;
  config: Record<string, unknown>;
}

/** Cards grouped by the dashboard region they render in. */
export interface DashboardRegionLayout {
  topbar: DashboardCard[];
  main: DashboardCard[];
  sidebar: DashboardCard[];
}

/** A single named dashboard "view" (tab), like a Lovelace dashboard view. */
export interface DashboardLayoutView {
  id: string;
  name: string;
  regions: DashboardRegionLayout;
}

/**
 * Shared data every card can read from. Built once per DashboardView render
 * so individual cards stay "dumb" (Phase 1); self-fetching HA entity cards
 * (Phase 3) will mostly ignore this and rely on `config` instead.
 */
export interface DashboardCardContext {
  now: Date;
  events: CalendarEvent[];
  weather: WeatherData | null;
  onWeatherClick?: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  members: FamilyMember[];
  selectedMemberFilter: string | null;
  toggleMemberFilter: (memberId: string) => void;
  byMember: Map<string, CalendarEvent[]>;
  other: CalendarEvent[];
  /** Day currently browsed via the topbar's day navigation (defaults to today). */
  selectedDate: Date;
  isViewingToday: boolean;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  todayEvents: CalendarEvent[];
  weekEvents: { day: Date; events: CalendarEvent[] }[];
  todaysMenu: DayMenu;
  todoItems: TodoItem[];
  onToggleTodo?: (uid: string, currentStatus: string) => void;
  filteredChores: Chore[];
  completedChoreIds: Set<string>;
  onToggleChore: (choreId: string) => void;
}

export interface DashboardCardProps {
  config: Record<string, unknown>;
  context: DashboardCardContext;
}

export type DashboardCardComponent = ComponentType<DashboardCardProps>;

export interface CardDefinition {
  type: string;
  displayName: string;
  icon: string;
  component: DashboardCardComponent;
  defaultConfig: Record<string, unknown>;
  defaultSize: CardSize;
  /** Regions this card type can be placed/added into via the card picker. */
  allowedRegions: DashboardRegion[];
}
