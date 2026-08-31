import { useEffect, useState } from 'react';
import { loadData, loadDataSync, saveData } from '../api/beacon-store';
import { DashboardCard, DashboardLayoutView, DashboardRegionLayout, GridPosition } from '../types/dashboard-cards';

const STORAGE_KEY = 'beacon-dashboard-layout';
const DEFAULT_VIEW_ID = 'default-view';

type DashboardPreset = 'default' | 'classic' | 'compact';

interface StoredDashboardLayoutV2 {
  version: 2;
  customized: boolean;
  activeViewId: string;
  views: DashboardLayoutView[];
}

/** Pre-Phase-4 shape, kept only for the one-time migration below. */
interface StoredDashboardLayoutV1 {
  customized: boolean;
  regions: DashboardRegionLayout;
}

function card(id: string, type: string, size: DashboardCard['size'], layout?: GridPosition): DashboardCard {
  return { id, type, size, layout, config: {} };
}

/** Builds the region layout matching today's visual arrangement for a given preset. */
function defaultLayoutFor(preset: DashboardPreset): DashboardRegionLayout {
  const topbar = [card('clock-weather', 'clock-weather', 'lg')];
  const sidebar = [card('menu', 'menu', 'sm'), card('tasks', 'tasks', 'sm')];

  if (preset === 'classic') {
    return {
      topbar,
      main: [card('agenda-today', 'agenda-today', 'md'), card('agenda-week', 'agenda-week', 'md')],
      sidebar,
    };
  }
  // 'default' and 'compact' both use the per-member family calendar as main content.
  return {
    topbar,
    main: [card('family-calendar', 'family-calendar', 'lg', { x: 0, y: 0, w: 12, h: 16 })],
    sidebar,
  };
}

function initialFor(preset: DashboardPreset): StoredDashboardLayoutV2 {
  return {
    version: 2,
    customized: false,
    activeViewId: DEFAULT_VIEW_ID,
    views: [{ id: DEFAULT_VIEW_ID, name: 'Dashboard', regions: defaultLayoutFor(preset) }],
  };
}

/** Migrates the Phase 1-3 single-region-layout shape into the multi-view (Phase 4) shape. */
function migrate(stored: StoredDashboardLayoutV1 | StoredDashboardLayoutV2, preset: DashboardPreset): StoredDashboardLayoutV2 {
  if ('version' in stored && stored.version === 2) return stored;
  const v1 = stored as StoredDashboardLayoutV1;
  return {
    version: 2,
    customized: v1.customized,
    activeViewId: DEFAULT_VIEW_ID,
    views: [{ id: DEFAULT_VIEW_ID, name: 'Dashboard', regions: v1.regions ?? defaultLayoutFor(preset) }],
  };
}

function makeViewId(): string {
  return `view-${Date.now()}`;
}

/**
 * Persists the dashboard's card layout across one or more named "views" (tabs).
 * Until the primary view is actually customized (Phase 2 edit mode), it always
 * follows the Settings `dashboardLayout` preset so switching presets keeps
 * working exactly as before. Additional views the user creates are always
 * fully custom (they have no preset to fall back to).
 */
export function useDashboardLayout(preset: DashboardPreset) {
  const [stored, setStored] = useState<StoredDashboardLayoutV2>(() =>
    migrate(loadDataSync(STORAGE_KEY, initialFor(preset)), preset),
  );

  useEffect(() => {
    loadData(STORAGE_KEY, initialFor(preset)).then((data) => setStored(migrate(data, preset)));
    // Only re-fetch on mount — preset changes are handled below without a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: StoredDashboardLayoutV2) => {
    setStored(next);
    saveData(STORAGE_KEY, next);
  };

  const activeIndex = Math.max(0, stored.views.findIndex((v) => v.id === stored.activeViewId));
  const activeView = stored.views[activeIndex];
  const isPrimaryView = activeView.id === DEFAULT_VIEW_ID;

  const regions = isPrimaryView && !stored.customized ? defaultLayoutFor(preset) : activeView.regions;

  const updateLayout = (regions: DashboardRegionLayout) => {
    const views = stored.views.map((v, i) => (i === activeIndex ? { ...v, regions } : v));
    persist({ ...stored, customized: true, views });
  };

  const resetToPreset = () => {
    if (!isPrimaryView) return;
    const views = stored.views.map((v, i) => (i === activeIndex ? { ...v, regions: defaultLayoutFor(preset) } : v));
    persist({ ...stored, customized: false, views });
  };

  const setActiveViewId = (id: string) => {
    persist({ ...stored, activeViewId: id });
  };

  const addView = (name: string) => {
    const id = makeViewId();
    const views = [...stored.views, { id, name, regions: { topbar: [], main: [], sidebar: [] } }];
    persist({ ...stored, views, activeViewId: id });
  };

  const renameView = (id: string, name: string) => {
    const views = stored.views.map((v) => (v.id === id ? { ...v, name } : v));
    persist({ ...stored, views });
  };

  const removeView = (id: string) => {
    if (stored.views.length <= 1) return;
    const views = stored.views.filter((v) => v.id !== id);
    const activeViewId = stored.activeViewId === id ? views[0].id : stored.activeViewId;
    persist({ ...stored, views, activeViewId });
  };

  return {
    layout: regions,
    customized: stored.customized,
    updateLayout,
    resetToPreset,
    views: stored.views,
    activeViewId: activeView.id,
    setActiveViewId,
    addView,
    renameView,
    removeView,
  };
}

