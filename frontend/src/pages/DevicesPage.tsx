import { useState } from 'react';
import { Smartphone, Lock, Unlock, Trash2, Plus, Copy } from 'lucide-react';
import { useDevices, useLockDevice, useUnlockDevice, useGeneratePairingCode } from '../hooks/useDevices';
import { useChildren } from '../hooks/useChildren';
import Modal from '../components/Modal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function DevicesPage() {
  const { data: devices, isLoading } = useDevices();
  const { data: children } = useChildren();
  const lock = useLockDevice();
  const unlock = useUnlockDevice();
  const generateCode = useGeneratePairingCode();
  const [showPair, setShowPair] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [pairingResult, setPairingResult] = useState<{ pairingCode: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const qc = useQueryClient();

  const deleteDevice = useMutation({
    mutationFn: (id: string) => api.delete(`/devices/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); toast.success('Device removed'); setConfirmDelete(null); },
    onError: () => toast.error('Failed to remove device'),
  });

  async function handleGenerateCode() {
    if (!selectedChild) { toast.error('Select a child'); return; }
    const result = await generateCode.mutateAsync(selectedChild);
    setPairingResult(result);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500 mt-1">Manage paired child devices</p>
        </div>
        <button onClick={() => setShowPair(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Pair device
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : devices && devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div key={device.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${device.isLocked ? 'bg-red-50' : 'bg-green-50'}`}>
                    <Smartphone className={`w-5 h-5 ${device.isLocked ? 'text-red-500' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{device.deviceName}</h3>
                    <p className="text-xs text-gray-500">{device.childProfile.name}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${device.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {device.isLocked ? 'Locked' : 'Active'}
                </span>
              </div>
              {device.deviceModel && <p className="text-xs text-gray-500 mb-1">{device.deviceModel}</p>}
              {device.lastSeen && (
                <p className="text-xs text-gray-400">
                  Last seen {format(new Date(device.lastSeen), 'MMM d, HH:mm')}
                </p>
              )}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                {device.isLocked ? (
                  <button onClick={() => unlock.mutate(device.id)} disabled={unlock.isPending}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary text-sm">
                    <Unlock className="w-3.5 h-3.5" /> Unlock
                  </button>
                ) : (
                  <button onClick={() => lock.mutate(device.id)} disabled={lock.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    <Lock className="w-3.5 h-3.5" /> Lock
                  </button>
                )}
                <button onClick={() => setConfirmDelete(device.id)}
                  className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove device">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">No devices paired yet</p>
          <button onClick={() => setShowPair(true)} className="btn-primary">Pair your first device</button>
        </div>
      )}

      {confirmDelete && (
        <Modal title="Remove device" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">This will permanently remove the device. The child app will need to be paired again.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => deleteDevice.mutate(confirmDelete)} disabled={deleteDevice.isPending} className="btn-danger">
                {deleteDevice.isPending ? 'Removing…' : 'Remove device'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPair && (
        <Modal title="Pair a device" onClose={() => { setShowPair(false); setPairingResult(null); }}>
          {!pairingResult ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Generate a pairing code, then enter it in the SafeGuard app on the child's device.
              </p>
              <div>
                <label className="label">Select child</label>
                <select className="input" value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
                  <option value="">— Choose a child —</option>
                  {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end">
                <button onClick={handleGenerateCode} disabled={generateCode.isPending} className="btn-primary">
                  {generateCode.isPending ? 'Generating…' : 'Generate code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">Enter this code in the SafeGuard child app:</p>
              <div className="bg-gray-100 rounded-xl p-6">
                <p className="text-4xl font-mono font-bold tracking-widest text-gray-900">
                  {pairingResult.pairingCode}
                </p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(pairingResult.pairingCode); toast.success('Copied!'); }}
                className="btn-secondary flex items-center gap-2 mx-auto"
              >
                <Copy className="w-4 h-4" /> Copy code
              </button>
              <p className="text-xs text-gray-400">This code expires after pairing is complete.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
