import { useEffect, useState } from 'react';
import { DashboardCardProps } from '../../types/dashboard-cards';
import { getEntityState } from '../../api/ha-rest';

const POLL_INTERVAL = 15_000;

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

function friendlyName(entity: EntityState, fallback: string): string {
  const name = entity.attributes.friendly_name;
  return typeof name === 'string' ? name : fallback;
}

/** Generic list-of-entities card, like Lovelace's "entities" card. */
export function HaEntitiesListCard({ config }: DashboardCardProps) {
  const entityIds = Array.isArray(config.entity_ids)
    ? (config.entity_ids as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];
  const title = typeof config.title === 'string' ? config.title : 'Entities';
  const [entities, setEntities] = useState<Record<string, EntityState>>({});

  useEffect(() => {
    if (entityIds.length === 0) return;
    let cancelled = false;
    const load = () => {
      Promise.all(entityIds.map((id) => getEntityState(id))).then((states) => {
        if (cancelled) return;
        const next: Record<string, EntityState> = {};
        states.forEach((state, i) => {
          if (state) next[entityIds[i]] = state;
        });
        setEntities(next);
      });
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityIds.join(',')]);

  if (entityIds.length === 0) {
    return (
      <section className="dash-sidebar-section dash-ha-card">
        <div className="dash-ha-card-empty">No entities selected — configure this card</div>
      </section>
    );
  }

  return (
    <section className="dash-sidebar-section dash-ha-card">
      <h3 className="dash-sidebar-heading">{title}</h3>
      <ul className="dash-ha-entities-list">
        {entityIds.map((id) => {
          const entity = entities[id];
          return (
            <li key={id} className="dash-ha-entities-item">
              <span className="dash-ha-entities-name">{entity ? friendlyName(entity, id) : id}</span>
              <span className="dash-ha-entities-state">{entity ? entity.state : '—'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
