import { useState, useEffect, useMemo } from 'react';
import { isSameDay, startOfDay, addDays, parseISO } from 'date-fns';
import { CalendarEvent, WeatherData } from '../types';
import { Chore, FamilyMember } from '../types/family';
import { useFamilyEvents } from '../hooks/useFamilyEvents';
import { useMealPlans } from '../hooks/useMealPlans';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { cardRegistry } from './cards/registry';
import { DashboardRegionEditor } from './cards/DashboardRegionEditor';
import { DashboardViewTabs } from './cards/DashboardViewTabs';
import { DashboardCard, DashboardCardContext, DashboardRegionLayout, TodoItem } from '../types/dashboard-cards';

export type { TodoItem } from '../types/dashboard-cards';

interface DashboardViewProps {
  events: CalendarEvent[];
  weather: WeatherData | null;
  chores: Chore[];
  completedChoreIds: Set<string>;
  onToggleChore: (choreId: string) => void;
  todoItems?: TodoItem[];
  onToggleTodo?: (uid: string, currentStatus: string) => void;
  onWeatherClick?: () => void;
  onEventClick?: (event: CalendarEvent) => void;
  members?: FamilyMember[];
  layout?: 'default' | 'classic' | 'compact';
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
}

function renderCard(card: DashboardCard, context: DashboardCardContext) {
  const definition = cardRegistry[card.type];
  if (!definition) return null;
  const Component = definition.component;
  return <Component key={card.id} config={card.config} context={context} />;
}

/** Like renderCard, but wraps the card so its `size` affects layout (main/sidebar only — topbar's card must stay the direct grid item). */
function renderSizedCard(card: DashboardCard, context: DashboardCardContext) {
  const definition = cardRegistry[card.type];
  if (!definition) return null;
  const Component = definition.component;
  return (
    <div key={card.id} className={`dash-card--${card.size}`}>
      <Component config={card.config} context={context} />
    </div>
  );
}

export function DashboardView({
  events,
  weather,
  chores,
  completedChoreIds,
  onToggleChore,
  todoItems = [],
  onToggleTodo,
  onWeatherClick,
  onEventClick,
  members = [],
  layout = 'default',
  selectedDate,
  onSelectedDateChange,
}: DashboardViewProps) {
  const [now, setNow] = useState(new Date());
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const toggleMemberFilter = (memberId: string) => {
    setSelectedMemberFilter((prev) => (prev === memberId ? null : memberId));
  };

  const goToPreviousDay = () => onSelectedDateChange(addDays(selectedDate, -1));
  const goToNextDay = () => onSelectedDateChange(addDays(selectedDate, 1));
  const goToToday = () => onSelectedDateChange(startOfDay(new Date()));
  const isViewingToday = isSameDay(selectedDate, startOfDay(now));

  const filteredChores = selectedMemberFilter
    ? chores.filter((c) => c.assigned_to.includes(selectedMemberFilter))
    : chores;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { byMember, other } = useFamilyEvents(events, members, selectedDate);
  const { todaysMenu } = useMealPlans();
  const { layout: regions, updateLayout, views, activeViewId, setActiveViewId, addView, renameView, removeView } = useDashboardLayout(layout);

  const updateRegion = (region: keyof DashboardRegionLayout, cards: DashboardCard[]) => {
    updateLayout({ ...regions, [region]: cards });
  };

  // Events for the currently selected day, used by the "other" / fallback view
  const todayEvents = useMemo(() => {
    return events
      .filter((e) => isSameDay(startOfDay(parseISO(e.start)), selectedDate))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [events, selectedDate]);

  // Group the next 7 days of events for the Classic "This Week" column
  const weekEvents = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const dayEvents = events
        .filter((e) => isSameDay(startOfDay(parseISO(e.start)), day))
        .sort((a, b) => a.start.localeCompare(b.start));
      return { day, events: dayEvents };
    });
  }, [events]);

  const context: DashboardCardContext = {
    now,
    events,
    weather,
    onWeatherClick,
    onEventClick,
    members,
    selectedMemberFilter,
    toggleMemberFilter,
    byMember,
    other,
    selectedDate,
    isViewingToday,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    todayEvents,
    weekEvents,
    todaysMenu,
    todoItems,
    onToggleTodo,
    filteredChores,
    completedChoreIds,
    onToggleChore,
  };

  // ─── Classic: clock + three agenda columns (Today | This Week | Tasks) ───
  if (layout === 'classic') {
    return (
      <div className="dashboard dashboard--classic">
        <button type="button" className="dash-edit-toggle" onClick={() => setEditMode((v) => !v)}>
          {editMode ? 'Done' : '✎ Edit Dashboard'}
        </button>
        <div className="dash-topbar-region">
          {(views.length > 1 || editMode) && (
            <DashboardViewTabs
              views={views}
              activeViewId={activeViewId}
              editMode={editMode}
              onSelect={setActiveViewId}
              onAdd={addView}
              onRename={renameView}
              onRemove={removeView}
            />
          )}
          {editMode ? (
            <DashboardRegionEditor region="topbar" cards={regions.topbar} context={context} onChange={(c) => updateRegion('topbar', c)} />
          ) : (
            regions.topbar.map((card) => renderCard(card, context))
          )}
        </div>
        <main className="dash-classic">
          {editMode ? (
            <DashboardRegionEditor region="main" cards={regions.main} context={context} onChange={(c) => updateRegion('main', c)} />
          ) : (
            regions.main.map((card) => renderCard(card, context))
          )}
          <aside className="dash-classic-col dash-classic-sidebar">
            {editMode ? (
              <DashboardRegionEditor region="sidebar" cards={regions.sidebar} context={context} onChange={(c) => updateRegion('sidebar', c)} />
            ) : (
              regions.sidebar.map((card) => renderSizedCard(card, context))
            )}
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className={`dashboard dashboard--${layout}`}>
      {/* ─── TOP BAR: Time + Date + Weather ─── */}
      <button type="button" className="dash-edit-toggle" onClick={() => setEditMode((v) => !v)}>
        {editMode ? 'Done' : '✎ Edit Dashboard'}
      </button>
      <div className="dash-topbar-region">
        {(views.length > 1 || editMode) && (
          <DashboardViewTabs
            views={views}
            activeViewId={activeViewId}
            editMode={editMode}
            onSelect={setActiveViewId}
            onAdd={addView}
            onRename={renameView}
            onRemove={removeView}
          />
        )}
        {editMode ? (
          <DashboardRegionEditor region="topbar" cards={regions.topbar} context={context} onChange={(c) => updateRegion('topbar', c)} />
        ) : (
          regions.topbar.map((card) => renderCard(card, context))
        )}
      </div>

      {/* ─── MAIN: Per-member calendar columns ─── */}
      <main className="dash-main">
        {editMode ? (
          <DashboardRegionEditor region="main" cards={regions.main} context={context} onChange={(c) => updateRegion('main', c)} />
        ) : (
          regions.main.map((card) => renderCard(card, context))
        )}
      </main>

      {/* ─── SIDEBAR: Menu + Tasks + Chores ─── */}
      <aside className="dash-sidebar">
        {editMode ? (
          <DashboardRegionEditor region="sidebar" cards={regions.sidebar} context={context} onChange={(c) => updateRegion('sidebar', c)} />
        ) : (
          regions.sidebar.map((card) => renderSizedCard(card, context))
        )}
      </aside>
    </div>
  );
}
