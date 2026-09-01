import { useEffect, useRef, useState } from 'react';
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
 * resize-handle approach.
 *
 * React renders each card's `.grid-stack-item` / content normally (it's
 * just JSX — no manual DOM/root management); GridStack only progressively
 * *enhances* those already-rendered elements via `makeWidget()`, and we
 * track which ids have been enhanced in `madeWidgetIds`.
 */
export function DashboardGridStack({ cards, context, editMode, onChange }: DashboardGridStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStack | null>(null);
  const itemElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const madeWidgetIds = useRef<Set<string>>(new Set());
  const cardsRef = useRef(cards);
  /** Always the latest onChange — the GridStack 'change' listener is registered
   * once (mount-only effect) so it must not close over a stale prop. */
  const onChangeRef = useRef(onChange);
  /** w/h to seed a just-added card with (set by handleAdd, consumed once when it's turned into a widget). */
  const pendingSizeRef = useRef<Map<string, { w: number; h: number }>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  cardsRef.current = cards;
  onChangeRef.current = onChange;

  const setItemRef = (id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemElsRef.current.set(id, el);
    } else {
      itemElsRef.current.delete(id);
    }
  };

  const removeCard = (id: string) => {
    const grid = gridRef.current;
    const el = itemElsRef.current.get(id);
    // Unregister from GridStack's engine while the element is still attached
    // (removeDOM: false — React removes the actual node on the next render).
    if (grid && el && madeWidgetIds.current.has(id)) {
      grid.removeWidget(el, false, false);
      madeWidgetIds.current.delete(id);
    }
    onChange(cardsRef.current.filter((c) => c.id !== id));
  };

  const syncPositions = (nodes: GridStackNode[]) => {
    const next = cardsRef.current.map((c) => {
      const node = nodes.find((n) => n.id === c.id);
      if (!node) return c;
      return { ...c, layout: { x: node.x ?? 0, y: node.y ?? 0, w: node.w ?? 1, h: node.h ?? 1 } };
    });
    // Registered once inside the mount-only effect below, so it must read
    // the latest onChange via the ref rather than closing over the prop.
    onChangeRef.current(next);
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
        staticGrid: !editMode,
        draggable: { handle: '.dash-card-edit-drag' },
        // We register every `.grid-stack-item` ourselves via makeWidget()
        // (see the sync effect below) so both initial and later-added cards
        // go through the same path — disable GridStack's own auto-scan of
        // existing DOM children on init to avoid double-registering them.
        auto: false,
      },
      containerRef.current,
    );
    if (!grid) return;
    gridRef.current = grid;

    grid.on('change', (_event, nodes) => syncPositions(nodes as GridStackNode[]));

    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (!height) return;
      grid.cellHeight(cellHeightFor(height));
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      grid.destroy(false);
      gridRef.current = null;
      madeWidgetIds.current.clear();
    };
    // Only ever set up once — editMode/card changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock/unlock dragging & resizing.
  useEffect(() => {
    gridRef.current?.setStatic(!editMode);
  }, [editMode]);

  // Turn any newly-rendered `.grid-stack-item` element into a GridStack
  // widget. Runs after every render (cheap — guarded by madeWidgetIds), since
  // a plain dependency array can't express "this card's DOM ref just became
  // available", which happens on the very next render after it's added.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const currentIds = new Set(cards.map((c) => c.id));
    // React removes the prior view's DOM before this effect runs, but GridStack
    // retains its nodes until explicitly told otherwise. Leaving them behind
    // makes a subsequently selected view collide with invisible widgets.
    grid.engine.nodes
      .filter((node) => node.id && !currentIds.has(node.id))
      .forEach((node) => {
        if (node.el) grid.removeWidget(node.el, false, false);
        madeWidgetIds.current.delete(node.id!);
      });
    cards.forEach((c) => {
      if (madeWidgetIds.current.has(c.id)) return;
      const el = itemElsRef.current.get(c.id);
      if (!el) return;
      const sizeHint = pendingSizeRef.current.get(c.id);
      pendingSizeRef.current.delete(c.id);
      const widget: GridStackWidget = {
        id: c.id,
        x: c.layout?.x,
        y: c.layout?.y,
        w: sizeHint?.w ?? c.layout?.w ?? DEFAULT_W,
        h: sizeHint?.h ?? c.layout?.h ?? DEFAULT_H,
        autoPosition: !c.layout,
      };
      grid.makeWidget(el, widget);
      madeWidgetIds.current.add(c.id);
      // Existing cards (e.g. the default full-height family calendar) may
      // already occupy all the visible space — scroll new ones into view.
      if (sizeHint) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
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
      <div className="grid-stack" ref={containerRef}>
        {cards.map((c) => {
          const definition = cardRegistry[c.type];
          if (!definition) return null;
          const Component = definition.component;
          return (
            <div key={c.id} className="grid-stack-item" ref={(el) => setItemRef(c.id, el)}>
              <div className="grid-stack-item-content">
                <div className="dash-gridstack-item-inner">
                  <Component config={c.config} context={context} />
                  {editMode && (
                    <div className="dash-card-edit-toolbar dash-card-edit-toolbar--overlay">
                      <button
                        type="button"
                        className="dash-card-edit-btn dash-card-edit-drag"
                        aria-label="Drag to move"
                        title="Drag to move"
                      >
                        ⠿
                      </button>
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
