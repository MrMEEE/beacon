import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Chore, FamilyMember, STAR_CURRENCY } from '../types/family';
import { ChoreCard } from './ChoreCard';
import { StreakBadge } from './StreakBadge';
import { useChores } from '../hooks/useChores';
import { useFamily } from '../hooks/useFamily';
import { useSettings } from '../hooks/useSettings';

const CHORE_ICONS = ['🧹', '🍽️', '🐕', '🛏️', '📚', '🗑️', '👕', '🧺', '🪥', '🚿', '🧼', '💪'];

const EMPTY_CHORE_FORM = {
  name: '',
  value_cents: 100,
  frequency: 'daily' as Chore['frequency'],
  assigned_to: [] as string[],
  icon: '🧹',
};

export function ChoresView() {
  const { members } = useFamily();
  const { settings } = useSettings();
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

  const [showForm, setShowForm] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [newChore, setNewChore] = useState({ ...EMPTY_CHORE_FORM });

  const isEditing = editingChoreId !== null;

  const openAddForm = (presetMemberId?: string) => {
    setNewChore({
      ...EMPTY_CHORE_FORM,
      assigned_to: presetMemberId ? [presetMemberId] : [],
    });
    setEditingChoreId(null);
    setShowForm(true);
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
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingChoreId(null);
    setNewChore({ ...EMPTY_CHORE_FORM });
  };

  const handleSaveChore = () => {
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

    handleCloseForm();
  };

  const handleDeleteChore = (id: string) => {
    removeChore(id);
    if (editingChoreId === id) {
      handleCloseForm();
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

  const memberChoreGroups = members.map((member) => ({
    member,
    chores: getChoresForMember(member.id),
    progress: getMemberProgress(member.id),
    streak: getStreakForMember(member.id),
  }));

  return (
    <div className="chores-view">
      <header className="chores-view-header">
        <h1 className="chores-view-title">Chores</h1>
        {members.length > 0 && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openAddForm()}
          >
            <Plus size={16} strokeWidth={2} />
            Add Chore
          </button>
        )}
      </header>

      {members.length === 0 ? (
        <div className="chores-empty">
          Add family members first to assign chores.
        </div>
      ) : (
        <div
          className="chores-family-grid"
          style={{ '--member-count': members.length } as React.CSSProperties}
        >
          {memberChoreGroups.map(({ member, chores: memberChores, progress, streak }) => (
            <section key={member.id} className="chores-member-col">
              <div className="dash-member-header">
                <span
                  className="dash-member-avatar"
                  style={{ backgroundColor: member.color + '22', borderColor: member.color }}
                >
                  {member.avatar}
                </span>
                <span className="dash-member-name" style={{ color: member.color }}>
                  {member.name}
                </span>
                <StreakBadge streak={streak} size="sm" />
              </div>

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

              <div className="chores-member-col-list">
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
                        currencySymbol={settings.currencySymbol}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="chores-member-add-btn"
                onClick={() => openAddForm(member.id)}
              >
                <Plus size={14} strokeWidth={2} />
                Add chore for {member.name}
              </button>
            </section>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditing ? 'Edit Chore' : 'New Chore'}</h2>
              <button type="button" className="modal-close" onClick={handleCloseForm}>
                {'\u00D7'}
              </button>
            </div>

            <div className="modal-body chores-add-form">
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
                  <span className="chores-value-prefix">
                    {settings.currencySymbol === STAR_CURRENCY ? STAR_CURRENCY : '$'}
                  </span>
                  <input
                    type="number"
                    className="form-input"
                    value={
                      settings.currencySymbol === STAR_CURRENCY
                        ? Math.round(newChore.value_cents / 100).toString()
                        : (newChore.value_cents / 100).toFixed(2)
                    }
                    onChange={(e) =>
                      setNewChore((f) => ({
                        ...f,
                        value_cents:
                          settings.currencySymbol === STAR_CURRENCY
                            ? Math.round(parseFloat(e.target.value || '0')) * 100
                            : Math.round(parseFloat(e.target.value || '0') * 100),
                      }))
                    }
                    step={settings.currencySymbol === STAR_CURRENCY ? '1' : '0.25'}
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
                  {members.map((m: FamilyMember) => (
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
            </div>

            <div className="modal-footer">
              {isEditing && (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => handleDeleteChore(editingChoreId)}
                >
                  Delete
                </button>
              )}
              <div className="modal-footer-right">
                <button type="button" className="btn btn--secondary" onClick={handleCloseForm}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSaveChore}
                  disabled={!newChore.name.trim() || newChore.assigned_to.length === 0}
                >
                  {isEditing ? 'Save Changes' : 'Add Chore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
