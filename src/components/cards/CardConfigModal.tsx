import { useState } from 'react';
import { DashboardCard } from '../../types/dashboard-cards';
import { EntityPicker, useEntityOptions } from './EntityPicker';
import { getCardDefinition } from './registry';

interface CardConfigModalProps {
  card: DashboardCard;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

function initialConfig(card: DashboardCard) {
  const definition = getCardDefinition(card.type);
  const config = { ...definition?.defaultConfig, ...card.config };
  definition?.configFields?.forEach((field) => {
    if (field.type !== 'entity-list' || !field.legacyKey || Array.isArray(config[field.key])) return;
    const legacyValue = config[field.legacyKey];
    if (typeof legacyValue === 'string' && legacyValue) {
      config[field.key] = [legacyValue];
      delete config[field.legacyKey];
    }
  });
  return config;
}

/** Generic per-card-type configuration form for advanced dashboard cards. */
export function CardConfigModal({ card, onSave, onClose }: CardConfigModalProps) {
  const definition = getCardDefinition(card.type);
  const fields = definition?.configFields ?? [];
  const [config, setConfig] = useState<Record<string, unknown>>(() => initialConfig(card));
  const options = useEntityOptions();

  const updateConfig = (key: string, value: unknown) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const toggleEntity = (key: string, entityId: string) => {
    const entityIds = Array.isArray(config[key])
      ? (config[key] as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    updateConfig(key, entityIds.includes(entityId)
      ? entityIds.filter((id) => id !== entityId)
      : [...entityIds, entityId]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Configure Card</h2>
          <button type="button" className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">
          {fields.map((field) => {
            const id = `card-config-${field.key}`;
            if (field.type === 'toggle') {
              return (
                <div key={field.key} className="settings-row">
                  <div>
                    <div className="settings-row-label">{field.label}</div>
                    {field.description && <div className="settings-row-sublabel">{field.description}</div>}
                  </div>
                  <input
                    type="checkbox"
                    checked={config[field.key] === true}
                    onChange={(event) => updateConfig(field.key, event.target.checked)}
                    aria-label={field.label}
                  />
                </div>
              );
            }
            if (field.type === 'entity-list') {
              const entityIds = Array.isArray(config[field.key])
                ? (config[field.key] as unknown[]).filter((id): id is string => typeof id === 'string')
                : [];
              return (
                <div key={field.key} className="form-field">
                  <label className="form-label">{field.label}</label>
                  <div className="dash-card-picker-entity-list">
                    {options.map((option) => (
                      <label key={option.entity_id} className="dash-card-picker-entity-option">
                        <input
                          type="checkbox"
                          checked={entityIds.includes(option.entity_id)}
                          onChange={() => toggleEntity(field.key, option.entity_id)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            const rawValue = config[field.key];
            const value = typeof rawValue === 'string' ? rawValue : '';
            return (
              <div key={field.key} className="form-field">
                <label className="form-label" htmlFor={id}>{field.label}</label>
                {field.type === 'entity' ? (
                  <EntityPicker
                    id={id}
                    value={value}
                    onChange={(value) => updateConfig(field.key, value)}
                  />
                ) : (
                  <input
                    id={id}
                    className="form-input"
                    type="text"
                    value={value}
                    onChange={(event) => updateConfig(field.key, event.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={() => onSave(config)}>Save</button>
        </div>
      </div>
    </div>
  );
}
