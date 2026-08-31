import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardCard, DashboardCardContext } from '../../types/dashboard-cards';
import { cardRegistry } from './registry';

interface SortableCardItemProps {
  card: DashboardCard;
  context: DashboardCardContext;
  configurable: boolean;
  resizable: boolean;
  onConfigure: () => void;
  onRemove: () => void;
  onResize: () => void;
}

/** Drag handle + remove/configure/resize overlay wrapper shown while editing the dashboard. */
export function SortableCardItem({ card, context, configurable, resizable, onConfigure, onRemove, onResize }: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const definition = cardRegistry[card.type];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!definition) return null;
  const Component = definition.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dash-card-edit-wrapper ${resizable ? `dash-card--${card.size}` : ''} ${isDragging ? 'dash-card-edit-wrapper--dragging' : ''}`}
    >
      <div className="dash-card-edit-toolbar">
        <button type="button" className="dash-card-edit-btn dash-card-edit-drag" {...attributes} {...listeners} aria-label="Drag to reorder">
          ⠿
        </button>
        {resizable && (
          <button type="button" className="dash-card-edit-btn" onClick={onResize} aria-label="Cycle card size" title={`Size: ${card.size}`}>
            ⤢
          </button>
        )}
        {configurable && (
          <button type="button" className="dash-card-edit-btn" onClick={onConfigure} aria-label="Configure card">
            ⚙
          </button>
        )}
        <button type="button" className="dash-card-edit-btn dash-card-edit-remove" onClick={onRemove} aria-label="Remove card">
          ✕
        </button>
      </div>
      <div className="dash-card-edit-content">
        <Component config={card.config} context={context} />
      </div>
    </div>
  );
}
