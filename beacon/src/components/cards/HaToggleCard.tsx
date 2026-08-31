import { useEffect, useState } from 'react';
import { DashboardCardProps } from '../../types/dashboard-cards';
import { getEntityState, callHaService } from '../../api/ha-rest';

const POLL_INTERVAL = 15_000;

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

/** Toggle card for a light/switch entity, like Lovelace's toggle row. */
export function HaToggleCard({ config }: DashboardCardProps) {
  const entityId = typeof config.entity_id === 'string' ? config.entity_id : '';
  const [entity, setEntity] = useState<EntityState | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    const load = () => {
      getEntityState(entityId).then((state) => {
        if (!cancelled) setEntity(state);
      });
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [entityId]);

  if (!entityId) {
    return (
      <section className="dash-sidebar-section dash-ha-card">
        <div className="dash-ha-card-empty">No entity selected — configure this card</div>
      </section>
    );
  }

  const domain = entityId.split('.')[0];
  const isOn = entity?.state === 'on';
  const name = typeof entity?.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : entityId;

  const handleToggle = async () => {
    setPending(true);
    try {
      await callHaService(domain, 'toggle', { entity_id: entityId });
      const state = await getEntityState(entityId);
      setEntity(state);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="dash-sidebar-section dash-ha-card">
      <button
        type="button"
        className={`dash-ha-toggle ${isOn ? 'dash-ha-toggle--on' : ''}`}
        onClick={handleToggle}
        disabled={pending || !entity}
        aria-pressed={isOn}
      >
        <span className="dash-ha-toggle-name">{name}</span>
        <span className="dash-ha-toggle-switch" />
      </button>
    </section>
  );
}
