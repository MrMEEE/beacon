import { useEffect, useState } from 'react';
import { DashboardCardProps } from '../../types/dashboard-cards';
import { getEntityState, callHaService } from '../../api/ha-rest';

const POLL_INTERVAL = 5_000;

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

/** Toggle card for a light/switch entity, like Lovelace's toggle row. */
export function HaToggleCard({ config }: DashboardCardProps) {
  const configuredEntityIds = Array.isArray(config.entity_ids)
    ? config.entity_ids.filter((entityId): entityId is string => typeof entityId === 'string')
    : [];
  // Existing cards stored one entity under entity_id before multi-toggle support.
  const legacyEntityId = typeof config.entity_id === 'string' ? config.entity_id : '';
  const entityIds = configuredEntityIds.length > 0 ? configuredEntityIds : legacyEntityId ? [legacyEntityId] : [];
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const subtitle = typeof config.subtitle === 'string' ? config.subtitle.trim() : '';
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [pendingEntityIds, setPendingEntityIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (entityIds.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const states = await Promise.all(entityIds.map((entityId) => getEntityState(entityId)));
      if (!cancelled) {
        setEntities((previous) => {
          const next = { ...previous };
          states.forEach((state) => {
            if (state) next[state.entity_id] = state;
          });
          return next;
        });
      }
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) void load();
    };
    void load();
    const interval = setInterval(refreshWhenVisible, POLL_INTERVAL);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [entityIds.join(',')]);

  const handleToggle = async (entityId: string) => {
    const entity = entities[entityId];
    if (!entity) return;
    const isOn = entity.state === 'on';
    setPendingEntityIds((previous) => new Set(previous).add(entityId));
    setEntities((previous) => ({
      ...previous,
      [entityId]: { ...entity, state: isOn ? 'off' : 'on' },
    }));
    try {
      await callHaService(entityId.split('.')[0], 'toggle', { entity_id: entityId });
      const updatedState = await getEntityState(entityId);
      if (updatedState) {
        setEntities((previous) => ({ ...previous, [entityId]: updatedState }));
      }
    } finally {
      setPendingEntityIds((previous) => {
        const next = new Set(previous);
        next.delete(entityId);
        return next;
      });
    }
  };

  if (entityIds.length === 0) {
    return (
      <section className="dash-sidebar-section dash-ha-card">
        {title && <h3 className="dash-sidebar-heading">{title}</h3>}
        {subtitle && <div className="dash-ha-card-subtitle">{subtitle}</div>}
        <div className="dash-ha-card-empty">No entity selected — configure this card</div>
      </section>
    );
  }

  return (
    <section className="dash-sidebar-section dash-ha-card">
      {title && <h3 className="dash-sidebar-heading">{title}</h3>}
      {subtitle && <div className="dash-ha-card-subtitle">{subtitle}</div>}
      <div className="dash-ha-toggle-list">
        {entityIds.map((entityId) => {
          const entity = entities[entityId];
          const isOn = entity?.state === 'on';
          const name = typeof entity?.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : entityId;
          return (
            <button
              key={entityId}
              type="button"
              className={`dash-ha-toggle ${isOn ? 'dash-ha-toggle--on' : ''}`}
              onClick={() => handleToggle(entityId)}
              disabled={pendingEntityIds.has(entityId) || !entity}
              aria-pressed={isOn}
            >
              <span className="dash-ha-toggle-name">{name}</span>
              <span className="dash-ha-toggle-switch" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
