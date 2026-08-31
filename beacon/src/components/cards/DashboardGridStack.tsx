import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GridStack, GridStackNode, GridStackWidget } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { cardRegistry } from './registry';
import { CardPickerModal } from './CardPickerModal';
import { CardConfigModal } from './CardConfigModal';
import { DashboardCard, DashboardCardContext } from '../../types/dashboard-cards';

interface DashboardGridStackProps {
  cards: DashboardCard[];
  context: DashboardCardContext;
  editMode: boolean;
  onChange: (cards: DashboardCard[]) => void;
}

const DEFAULT_W = 12;
const DEFAULT_H = 10;
const MARGIN = 8;
/** The main region is treated as 16 logical rows tall, so h:16 always means
 * "fill the available height" regardless of viewport size (see the
 * ResizeObserver below, which keeps cellHeight in sync with this). */
const TOTAL_ROWS = 16;

/** cellHeight (px) so that TOTAL_ROWS rows + their margins exactly fill `height`. */
function cellHeightFor(height: number): number {
  const usable = height - (TOTAL_ROWS - 1) * MARGIN;
  return Math.max(1, usable / TOTAL_ROWS);
}

/** Width/height (in grid units) to seed a newly added card with, based on its registry default size. */
function defaultSpanFor(size: DashboardCard['size']): { w: number; h: number } {
  if (size === 'sm') return { w: 3, h: 4 };
  if (size === 'md') return { w: 6, h: 8 };
  return { w: 12, h: TOTAL_ROWS };
}

/**
 * Wraps GridStack (https://gridstackjs.com/) for the main region: a real
 * drag-and-resize dashboard grid, replacing the old dnd-kit + manual
 * resize-handle approach. GridStack owns the DOM position of each
 * `.grid-stack-item`; each item's content is a small, independently
 * mounted React root so our card components keep working unmodified.
 */
export function DashboardGridStack({ cards, context, editMode, onChange }: DashboardGridStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStack | null>(null);
  const rootsRef = useRef<Map<string, Root>>(new Map());
  const cardsRef = useRef(cards);
  const contextRef = useRef(context);
  /** w/h to seed a just-added card with (set by handleAdd, consumed once by addWidget). */
  const pendingSizeRef = useRef<Map<string, { w: number; h: number }>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  cardsRef.current = cards;
  contextRef.current = context;

  // editMode is read inside GridStack event callbacks (closures captured at
  // mount time), so mirror it in a ref rather than depending on it directly.
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;

  const renderCardIntoRoot = (id: string, root: Root) => {
    const c = cardsRef.current.find((x) => x.id === id);
    const definition = c && cardRegistry[c.type];
    if (!c || !definition) return;
    const Component = definition.component;
    root.render(
      <div className="dash-gridstack-item-inner">
        <Component config={c.config} context={contextRef.current} />
        {editModeRef.current && (
          <div className="dash-card-edit-toolbar dash-card-edit-toolbar--overlay">
            <span className="dash-card-edit-btn dash-card-edit-drag" aria-hidden="true" title="Drag to move">
              ⠿
            </span>
            {c.type.startsWith('ha-') && (
              <button
                type="button"
                className="dash-card-edit-btn"
                onClick={() => setConfiguringId(c.id)}
                aria-label="Configure card"
              >
                ⚙
              </button>
            )}
            <button
              type="button"
              className="dash-card-edit-btn dash-card-edit-remove"
              onClick={() => removeCard(c.id)}
              aria-label="Remove card"
            >
              ✕
            </button>
          </div>
        )}
      </div>,
    );
  };

  const addWidget = (c: DashboardCard) => {
    const grid = gridRef.current;
    if (!grid || rootsRef.current.has(c.id)) return;
    const sizeHint = pendingSizeRef.current.get(c.id);
    pendingSizeRef.current.delete(c.id);
    const widget: GridStackWidget = {
      id: c.id,
      x: c.layout?.x,
      y: c.layout?.y,
      w: sizeHint?.w ?? c.layout?.w ?? DEFAULT_W,
      h: sizeHint?.h ?? c.layout?.h ?? DEFAULT_H,
      autoPosition: !c.layout,
      content: '',
    };
    const el = grid.addWidget(widget);
    const contentEl = el?.querySelector('.grid-stack-item-content');
    if (contentEl) {
      const root = createRoot(contentEl);
      rootsRef.current.set(c.id, root);
      renderCardIntoRoot(c.id, root);
    }
  };

  const removeCard = (id: string) => {
    onChange(cardsRef.current.filter((c) => c.id !== id));
  };

  const syncPositions = (nodes: GridStackNode[]) => {
    const next = cardsRef.current.map((c) => {
      const node = nodes.find((n) => n.id === c.id);
      if (!node) return c;
      return { ...c, layout: { x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 } };
    });
    onChange(next);
  };

  // Mount GridStack once.
  useEffect(() => {
    if (!containerRef.current) return;
    const grid = GridStack.init(
      {
        column: 12,
        cellHeight: containerRef.current.clientHeight ? cellHeightFor(containerRef.current.clientHeight) : 40,
        margin: MARGIN,
        float: true,
        staticGrid: !editModeRef.current,
        draggable: { handle: '.dash-card-edit-drag' },
      },
      containerRef.current,
    );
    if (!grid) return;
    gridRef.current = grid;

    grid.on('change', (_event, nodes) => syncPositions(nodes as GridStackNode[]));

    cardsRef.current.forEach((c) => addWidget(c));

    // Keep 1 row == 1/TOTAL_ROWS of the container's actual height, so a
    // full-height (h:16) card always fills the region, on any screen size.
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (!height) return;
      grid.cellHeight(cellHeightFor(height));
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      rootsRef.current.forEach((root) => root.unmount());
      rootsRef.current.clear();
      grid.destroy(true);
      gridRef.current = null;
    };
    // Only ever set up once — card add/remove/edit-mode are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock/unlock dragging & resizing.
  useEffect(() => {
    gridRef.current?.setStatic(!editMode);
  }, [editMode]);

  // Add/remove GridStack widgets when the set of card ids changes.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const currentIds = new Set(cards.map((c) => c.id));
    rootsRef.current.forEach((root, id) => {
      if (currentIds.has(id)) return;
      root.unmount();
      rootsRef.current.delete(id);
      const el = grid.getGridItems().find((item) => item.getAttribute('gs-id') === id);
      if (el) grid.removeWidget(el, true, false);
    });
    cards.forEach((c) => addWidget(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.map((c) => c.id).join(',')]);

  // Re-render each card's content on config/context changes and to reflect edit-mode toolbar visibility.
  useEffect(() => {
    rootsRef.current.forEach((root, id) => renderCardIntoRoot(id, root));
  });

  const handleAdd = (type: string) => {
    const definition = cardRegistry[type];
    if (!definition) return;
    const newCard: DashboardCard = {
      id: `${type}-${Date.now()}`,
      type,
      size: definition.defaultSize,
      config: { ...definition.defaultConfig },
    };
    pendingSizeRef.current.set(newCard.id, defaultSpanFor(definition.defaultSize));
    onChange([...cardsRef.current, newCard]);
    setPickerOpen(false);
  };

  const handleConfigSave = (config: Record<string, unknown>) => {
    if (!configuringId) return;
    onChange(cardsRef.current.map((c) => (c.id === configuringId ? { ...c, config } : c)));
    setConfiguringId(null);
  };

  const configuringCard = cards.find((c) => c.id === configuringId) ?? null;

  return (
    <div className="dash-gridstack-wrapper">
      <div className="grid-stack" ref={containerRef} />
      {editMode && (
        <button type="button" className="dash-card-add-tile" onClick={() => setPickerOpen(true)}>
          + Add Card
        </button>
      )}
      {pickerOpen && (
        <CardPickerModal region="main" onPick={handleAdd} onClose={() => setPickerOpen(false)} />
      )}
      {configuringCard && (
        <CardConfigModal card={configuringCard} onSave={handleConfigSave} onClose={() => setConfiguringId(null)} />
      )}
    </div>
  );
}
