import { CardDefinition } from '../../types/dashboard-cards';
import { ClockWeatherCard } from './ClockWeatherCard';
import { FamilyCalendarCard } from './FamilyCalendarCard';
import { AgendaTodayCard } from './AgendaTodayCard';
import { AgendaWeekCard } from './AgendaWeekCard';
import { MenuCard } from './MenuCard';
import { TasksCard } from './TasksCard';

export const cardRegistry: Record<string, CardDefinition> = {
  'clock-weather': {
    type: 'clock-weather',
    displayName: 'Clock & Weather',
    icon: '🕐',
    component: ClockWeatherCard,
    defaultConfig: {},
    defaultSize: 'lg',
  },
  'family-calendar': {
    type: 'family-calendar',
    displayName: 'Family Calendar',
    icon: '📅',
    component: FamilyCalendarCard,
    defaultConfig: {},
    defaultSize: 'lg',
  },
  'agenda-today': {
    type: 'agenda-today',
    displayName: 'Today',
    icon: '📋',
    component: AgendaTodayCard,
    defaultConfig: {},
    defaultSize: 'md',
  },
  'agenda-week': {
    type: 'agenda-week',
    displayName: 'This Week',
    icon: '🗓️',
    component: AgendaWeekCard,
    defaultConfig: {},
    defaultSize: 'md',
  },
  menu: {
    type: 'menu',
    displayName: 'Menu',
    icon: '🍽️',
    component: MenuCard,
    defaultConfig: {},
    defaultSize: 'sm',
  },
  tasks: {
    type: 'tasks',
    displayName: 'Tasks',
    icon: '✅',
    component: TasksCard,
    defaultConfig: {},
    defaultSize: 'sm',
  },
};

export function getCardDefinition(type: string): CardDefinition | undefined {
  return cardRegistry[type];
}
