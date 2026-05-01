import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { useChildren, useCreateChild, useDeleteChild } from '../hooks/useChildren';
import ChildAvatar from '../components/ChildAvatar';
import Modal from '../components/Modal';

function ChildForm({ onSubmit, loading, initial }: {
  onSubmit: (data: { name: string; age: number; dailyScreenLimit: number; bedtimeStart: string; bedtimeEnd: string }) => void;
  loading: boolean;
  initial?: { name: string; age: number; dailyScreenLimit: number; bedtimeStart?: string; bedtimeEnd?: string };
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial?.age ?? 10);
  const [limit, setLimit] = useState(initial?.dailyScreenLimit ?? 120);
  const [bedStart, setBedStart] = useState(initial?.bedtimeStart ?? '21:00');
  const [bedEnd, setBedEnd] = useState(initial?.bedtimeEnd ?? '07:00');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, age, dailyScreenLimit: limit, bedtimeStart: bedStart, bedtimeEnd: bedEnd }); }} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Child's name" />
      </div>
      <div>
        <label className="label">Age</label>
        <input className="input" type="number" min={1} max={17} required value={age} onChange={(e) => setAge(+e.target.value)} />
      </div>
      <div>
        <label className="label">Daily screen limit (minutes)</label>
        <input className="input" type="number" min={0} max={1440} value={limit} onChange={(e) => setLimit(+e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bedtime start</label>
          <input className="input" type="time" value={bedStart} onChange={(e) => setBedStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Bedtime end</label>
          <input className="input" type="time" value={bedEnd} onChange={(e) => setBedEnd(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function ChildrenPage() {
  const { data: children, isLoading } = useChildren();
  const createChild = useCreateChild();
  const deleteChild = useDeleteChild();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-500 mt-1">Manage your children's profiles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add child
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : children && children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {children.map((child) => (
            <div key={child.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ChildAvatar name={child.name} size="lg" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-500">{child.age} years old</p>
                  </div>
                </div>
                <button onClick={() => setDeleteId(child.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Daily limit</span>
                  <span className="font-medium">{Math.floor(child.dailyScreenLimit / 60)}h {child.dailyScreenLimit % 60}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Devices</span>
                  <span className="font-medium">{child.devices.length}</span>
                </div>
                {child.bedtimeStart && (
                  <div className="flex justify-between">
                    <span>Bedtime</span>
                    <span className="font-medium">{child.bedtimeStart} – {child.bedtimeEnd}</span>
                  </div>
                )}
              </div>
              <Link to={`/children/${child.id}`}
                className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-primary-600 text-sm font-medium hover:text-primary-700">
                View details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-lg mb-4">No children added yet</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Add your first child</button>
        </div>
      )}

      {showCreate && (
        <Modal title="Add child profile" onClose={() => setShowCreate(false)}>
          <ChildForm
            loading={createChild.isPending}
            onSubmit={(data) => createChild.mutate(data, { onSuccess: () => setShowCreate(false) })}
          />
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete child profile?" onClose={() => setDeleteId(null)}>
          <p className="text-gray-600 text-sm mb-6">This will permanently delete all data for this child profile including device history and screen time records.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => deleteChild.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
              disabled={deleteChild.isPending}
              className="btn-danger"
            >
              {deleteChild.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
