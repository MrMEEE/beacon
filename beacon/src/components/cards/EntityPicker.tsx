import { useEffect, useState } from 'react';
import { getAllEntityStates } from '../../api/ha-rest';

interface EntityOption {
  entity_id: string;
  label: string;
}

/** Loads and caches the HA entity list for entity-picker dropdowns/checklists. */
export function useEntityOptions(): EntityOption[] {
  const [options, setOptions] = useState<EntityOption[]>([]);

  useEffect(() => {
    getAllEntityStates().then((states) => {
      const opts = states
        .map((s) => ({
          entity_id: s.entity_id,
          label: typeof s.attributes.friendly_name === 'string' ? s.attributes.friendly_name : s.entity_id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOptions(opts);
    });
  }, []);

  return options;
}

interface EntityPickerProps {
  value: string;
  onChange: (entityId: string) => void;
  id?: string;
}

/** Single-entity picker dropdown, like Lovelace's entity config field. */
export function EntityPicker({ value, onChange, id }: EntityPickerProps) {
  const options = useEntityOptions();

  return (
    <select id={id} className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select an entity…</option>
      {options.map((opt) => (
        <option key={opt.entity_id} value={opt.entity_id}>
          {opt.label} ({opt.entity_id})
        </option>
      ))}
    </select>
  );
}
