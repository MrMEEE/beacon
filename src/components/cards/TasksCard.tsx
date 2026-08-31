import { DashboardCardProps } from '../../types/dashboard-cards';
import { TaskChecklist } from '../TaskChecklist';

/** Sidebar "Tasks" section — HA todo items, or chores checklist fallback. */
export function TasksCard({ context }: DashboardCardProps) {
  const { todoItems, onToggleTodo, filteredChores, completedChoreIds, onToggleChore, members } = context;

  const pending = todoItems.filter((t) => t.status === 'needs_action');

  return (
    <section className="dash-sidebar-section">
      <h3 className="dash-sidebar-heading">Tasks</h3>
      {todoItems.length > 0 ? (
        pending.length > 0 ? (
          <ul className="task-checklist">
            {pending.map((item) => (
              <li key={item.uid} className="task-checklist-item">
                <button
                  type="button"
                  className="task-checkbox"
                  onClick={() => onToggleTodo?.(item.uid, item.status)}
                  aria-label={`Complete ${item.summary}`}
                >
                  <span className="task-checkbox-box" />
                </button>
                <span className="task-checklist-label">{item.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="task-checklist-done">All done!</div>
        )
      ) : (
        <TaskChecklist
          chores={filteredChores}
          completedIds={completedChoreIds}
          onToggle={onToggleChore}
          members={members}
        />
      )}
    </section>
  );
}
