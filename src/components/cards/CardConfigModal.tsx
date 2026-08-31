import { useState } from 'react';
import { DashboardCard } from '../../types/dashboard-cards';
import { EntityPicker, useEntityOptions } from './EntityPicker';

interface CardConfigModalProps {
  card: DashboardCard;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

/** Generic per-card-type config form (only HA card types are configurable today). */
export function CardConfigModal({ card, onSave, onClose }: CardConfigModalProps) {
  const [entityId, setEntityId] = useState(typeof card.config.entity_id === 'string' ? card.config.entity_id : '');
  const [title, setTitle] = useState(typeof card.config.title === 'string' ? card.config.title : 'Entities');
  const [entityIds, setEntityIds] = useState<string[]>(
    Array.isArray(card.config.entity_ids) ? (card.config.entity_ids as string[]) : [],
  );
  const options = useEntityOptions();

  const toggleEntity = (id: string) => {
    setEntityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = () => {
    if (card.type === 'ha-entities-list') {
      onSave({ title, entity_ids: entityIds });
    } else {
      onSave({ entity_id: entityId });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Configure Card</h2>
          <button type="button" className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">
          {card.type === 'ha-entities-list' ? (
            <>
              <div className="form-field">
                <label className="form-label" htmlFor="card-config-title">Title</label>
                <input
                  id="card-config-title"
                  className="form-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Entities</label>
                <div className="dash-card-picker-entity-list">
                  {options.map((opt) => (
                    <label key={opt.entity_id} className="dash-card-picker-entity-option">
                      <input
                        type="checkbox"
                        checked={entityIds.includes(opt.entity_id)}
                        onChange={() => toggleEntity(opt.entity_id)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="form-field">
              <label className="form-label" htmlFor="card-config-entity">Entity</label>
              <EntityPicker id="card-config-entity" value={entityId} onChange={setEntityId} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
