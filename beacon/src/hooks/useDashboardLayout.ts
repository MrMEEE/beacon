import { useEffect, useState } from 'react';
import { loadData, loadDataSync, saveData } from '../api/beacon-store';
import { DashboardCard, DashboardRegionLayout } from '../types/dashboard-cards';

const STORAGE_KEY = 'beacon-dashboard-layout';

type DashboardPreset = 'default' | 'classic' | 'compact';

interface StoredDashboardLayout {
  customized: boolean;
  regions: DashboardRegionLayout;
}

function card(id: string, type: string, size: DashboardCard['size']): DashboardCard {
  return { id, type, size, config: {} };
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
    main: [card('family-calendar', 'family-calendar', 'lg')],
    sidebar,
  };
}

function initialFor(preset: DashboardPreset): StoredDashboardLayout {
  return { customized: false, regions: defaultLayoutFor(preset) };
}

/**
 * Persists the dashboard's card layout. Until the user actually customizes it
 * (Phase 2 edit mode), the layout always follows the Settings `dashboardLayout`
 * preset so switching presets keeps working exactly as before.
 */
export function useDashboardLayout(preset: DashboardPreset) {
  const [stored, setStored] = useState<StoredDashboardLayout>(() =>
    loadDataSync(STORAGE_KEY, initialFor(preset)),
  );

  useEffect(() => {
    loadData(STORAGE_KEY, initialFor(preset)).then(setStored);
    // Only re-fetch on mount — preset changes are handled below without a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regions = stored.customized ? stored.regions : defaultLayoutFor(preset);

  const updateLayout = (regions: DashboardRegionLayout) => {
    const next: StoredDashboardLayout = { customized: true, regions };
    setStored(next);
    saveData(STORAGE_KEY, next);
  };

  const resetToPreset = () => {
    const next = initialFor(preset);
    setStored(next);
    saveData(STORAGE_KEY, next);
  };

  return { layout: regions, customized: stored.customized, updateLayout, resetToPreset };
}
