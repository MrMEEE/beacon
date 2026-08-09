import { useState } from 'react';
import { Chore } from '../types/family';
import { ChoreCard } from './ChoreCard';
import { StreakBadge } from './StreakBadge';
import { useChores } from '../hooks/useChores';
import { useFamily } from '../hooks/useFamily';

interface ChoresPanelProps {
  open: boolean;
  onClose: () => void;
}

const CHORE_ICONS = ['🧹', '🍽️', '🐕', '🛏️', '📚', '🗑️', '👕', '🧺', '🪥', '🚿', '🧼', '💪'];

const EMPTY_CHORE_FORM = {
  name: '',
  value_cents: 100,
  frequency: 'daily' as Chore['frequency'],
  assigned_to: [] as string[],
  icon: '🧹',
};

export function ChoresPanel({ open, onClose }: ChoresPanelProps) {
  const { members } = useFamily();
  const {
    addChore,
    updateChore,
    removeChore,
    completeChore,
    uncompleteChore,
    isChoreCompletedToday,
    getStreakForMember,
    getChoresForMember,
    getMemberProgress,
  } = useChores();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [newChore, setNewChore] = useState({ ...EMPTY_CHORE_FORM });

  const isEditing = editingChoreId !== null;

  const handleAddChore = () => {
    if (!newChore.name.trim() || newChore.assigned_to.length === 0) return;

    if (isEditing) {
      updateChore(editingChoreId, {
        name: newChore.name.trim(),
        value_cents: newChore.value_cents,
        frequency: newChore.frequency,
        assigned_to: newChore.assigned_to,
        icon: newChore.icon,
      });
    } else {
      addChore({
        name: newChore.name.trim(),
        value_cents: newChore.value_cents,
        frequency: newChore.frequency,
        assigned_to: newChore.assigned_to,
        icon: newChore.icon,
      });
    }

    setNewChore({ ...EMPTY_CHORE_FORM });
    setShowAddForm(false);
    setEditingChoreId(null);
  };

  const handleStartEdit = (chore: Chore) => {
    setNewChore({
      name: chore.name,
      value_cents: chore.value_cents,
      frequency: chore.frequency,
      assigned_to: [...chore.assigned_to],
      icon: chore.icon || '🧹',
    });
    setEditingChoreId(chore.id);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingChoreId(null);
    setNewChore({ ...EMPTY_CHORE_FORM });
  };

  const handleDeleteChore = (id: string) => {
    removeChore(id);
    if (editingChoreId === id) {
      handleCancelForm();
    }
  };

  const toggleAssigned = (memberId: string) => {
    setNewChore((prev) => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(memberId)
        ? prev.assigned_to.filter((id) => id !== memberId)
        : [...prev.assigned_to, memberId],
    }));
  };

  // Group chores by member
  const memberChoreGroups = members.map((member) => ({
    member,
    chores: getChoresForMember(member.id),
    progress: getMemberProgress(member.id),
    streak: getStreakForMember(member.id),
  }));

  // Check if the user is a parent (for showing add button)
  const hasParent = members.some((m) => m.role === 'parent');

  return (
    <div className={`slide-panel slide-panel--right ${open ? 'slide-panel--open' : ''}`}>
      <div className="slide-panel-header">
        <h2 className="slide-panel-title">Chores</h2>
        <button type="button" className="modal-close" onClick={onClose}>
          {'\u00D7'}
        </button>
      </div>

      <div className="slide-panel-body">
        {members.length === 0 && (
          <div className="chores-empty">
            Add family members first to assign chores.
          </div>
        )}

        {memberChoreGroups.map(({ member, chores: memberChores, progress, streak }) => (
          <div key={member.id} className="chores-group">
            {/* Member header */}
            <div className="chores-group-header">
              <span
                className="chores-group-avatar"
                style={{ backgroundColor: member.color + '22', borderColor: member.color }}
              >
                {member.avatar}
              </span>
              <span className="chores-group-name">{member.name}</span>
              <StreakBadge streak={streak} size="sm" />
            </div>

            {/* Progress bar */}
            {memberChores.length > 0 && (
              <div className="chores-progress">
                <div className="chores-progress-bar">
                  <div
                    className="chores-progress-fill"
                    style={{
                      width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                      backgroundColor: member.color,
                    }}
                  />
                </div>
                <span className="chores-progress-text">
                  {progress.completed}/{progress.total}
                </span>
              </div>
            )}

            {/* Chore cards */}
            {memberChores.length === 0 ? (
              <div className="chores-member-empty">No chores assigned</div>
            ) : (
              <div className="chores-list">
                {memberChores.map((chore) => (
                  <ChoreCard
                    key={`${chore.id}-${member.id}`}
                    chore={chore}
                    member={member}
                    isCompleted={isChoreCompletedToday(chore.id, member.id)}
                    onComplete={() => completeChore(chore.id, member.id)}
                    onUncomplete={() => uncompleteChore(chore.id, member.id)}
                    onEdit={() => handleStartEdit(chore)}
                    onDelete={() => handleDeleteChore(chore.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add / Edit Chore */}
        {(hasParent || members.length > 0) && (
          <>
            {!showAddForm ? (
              <button
                type="button"
                className="btn btn--primary chores-add-btn"
                onClick={() => setShowAddForm(true)}
              >
                + Add Chore
              </button>
            ) : (
              <div className="chores-add-form">
                <h3 className="chores-add-title">{isEditing ? 'Edit Chore' : 'New Chore'}</h3>

                {/* Icon picker */}
                <div className="form-field">
                  <label className="form-label">Icon</label>
                  <div className="fm-avatar-grid">
                    {CHORE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`fm-avatar-option ${newChore.icon === icon ? 'fm-avatar-option--selected' : ''}`}
                        onClick={() => setNewChore((f) => ({ ...f, icon }))}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newChore.name}
                    onChange={(e) => setNewChore((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Vacuum living room"
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Value</label>
                  <div className="chores-value-input">
                    <span className="chores-value-prefix">$</span>
                    <input
                      type="number"
                      className="form-input"
                      value={(newChore.value_cents / 100).toFixed(2)}
                      onChange={(e) =>
                        setNewChore((f) => ({
                          ...f,
                          value_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                        }))
                      }
                      step="0.25"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={newChore.frequency}
                    onChange={(e) =>
                      setNewChore((f) => ({ ...f, frequency: e.target.value as Chore['frequency'] }))
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="once">One-time</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Assign To</label>
                  <div className="chores-assign-grid">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`chores-assign-btn ${newChore.assigned_to.includes(m.id) ? 'chores-assign-btn--active' : ''}`}
                        onClick={() => toggleAssigned(m.id)}
                        style={
                          newChore.assigned_to.includes(m.id)
                            ? { borderColor: m.color, backgroundColor: m.color + '15' }
                            : {}
                        }
                      >
                        <span>{m.avatar}</span>
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="chores-add-actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleCancelForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleAddChore}
                    disabled={!newChore.name.trim() || newChore.assigned_to.length === 0}
                  >
                    {isEditing ? 'Save Changes' : 'Add Chore'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
