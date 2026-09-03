import { useEffect, useState } from 'react';
import { DashboardCardProps } from '../../types/dashboard-cards';
import { getEntityState } from '../../api/ha-rest';

const POLL_INTERVAL = 15_000;

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

function friendlyName(entity: EntityState | null, fallback: string): string {
  const name = entity?.attributes.friendly_name;
  return typeof name === 'string' ? name : fallback;
}

/** Generic single-entity state card, like Lovelace's "entity" card. */
export function HaEntityCard({ config }: DashboardCardProps) {
  const entityId = typeof config.entity_id === 'string' ? config.entity_id : '';
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const subtitle = typeof config.subtitle === 'string' ? config.subtitle.trim() : '';
  const [entity, setEntity] = useState<EntityState | null>(null);

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
        {title && <h3 className="dash-sidebar-heading">{title}</h3>}
        {subtitle && <div className="dash-ha-card-subtitle">{subtitle}</div>}
        <div className="dash-ha-card-empty">No entity selected — configure this card</div>
      </section>
    );
  }

  const unit = entity?.attributes.unit_of_measurement;

  return (
    <section className="dash-sidebar-section dash-ha-card">
      <h3 className="dash-sidebar-heading">{title || friendlyName(entity, entityId)}</h3>
      {subtitle && <div className="dash-ha-card-subtitle">{subtitle}</div>}
      <div className="dash-ha-card-state">
        {entity ? entity.state : '—'}
        {typeof unit === 'string' && entity ? <span className="dash-ha-card-unit">{unit}</span> : null}
      </div>
    </section>
  );
}
