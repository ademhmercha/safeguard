import { useState } from 'react';
import { Lock, Unlock, Ban, Plus, Trash2, Calendar, Globe } from 'lucide-react';
import { useChildren } from '../hooks/useChildren';
import { useLockDevice, useUnlockDevice, useDevices } from '../hooks/useDevices';
import { api } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface Policy {
  id: string;
  policyType: string;
  packageName?: string;
  appName?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  daysOfWeek: number[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const policyBadge: Record<string, { label: string; className: string }> = {
  APP_BLOCK:      { label: 'App Block',    className: 'bg-red-100 text-red-700' },
  CONTENT_FILTER: { label: 'Website Block', className: 'bg-orange-100 text-orange-700' },
  SCHEDULE:       { label: 'Schedule',     className: 'bg-blue-100 text-blue-700' },
};

export default function ControlsPage() {
  const { data: children } = useChildren();
  const { data: devices } = useDevices();
  const [childId, setChildId] = useState('');
  const qc = useQueryClient();
  const lock = useLockDevice();
  const unlock = useUnlockDevice();
  const [showBlockApp, setShowBlockApp]         = useState(false);
  const [showBlockSite, setShowBlockSite]       = useState(false);
  const [showSchedule, setShowSchedule]         = useState(false);
  const [appForm, setAppForm]                   = useState({ packageName: '', appName: '' });
  const [siteForm, setSiteForm]                 = useState({ domain: '' });
  const [scheduleForm, setScheduleForm]         = useState({ scheduleStart: '21:00', scheduleEnd: '07:00', daysOfWeek: [0,1,2,3,4,5,6] });

  const activeChildId = childId || children?.[0]?.id || '';

  const { data: policies } = useQuery<Policy[]>({
    queryKey: ['policies', activeChildId],
    queryFn: () => api.get(`/control/policies/${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const blockApp = useMutation({
    mutationFn: (data: { childProfileId: string; packageName: string; appName: string }) =>
      api.post('/control/block-app', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('App blocked'); setShowBlockApp(false); setAppForm({ packageName: '', appName: '' }); },
    onError: () => toast.error('Failed to block app'),
  });

  const blockSite = useMutation({
    mutationFn: (data: { childProfileId: string; domain: string }) =>
      api.post('/control/block-website', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('Website blocked'); setShowBlockSite(false); setSiteForm({ domain: '' }); },
    onError: () => toast.error('Failed to block website'),
  });

  const addSchedule = useMutation({
    mutationFn: (data: object) => api.post('/control/schedule', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('Schedule added'); setShowSchedule(false); },
    onError: () => toast.error('Failed to add schedule'),
  });

  const removePolicy = useMutation({
    mutationFn: (p: Policy) => {
      if (p.policyType === 'CONTENT_FILTER') return api.delete(`/control/block-website/${p.id}`).then((r) => r.data);
      return api.delete(`/control/block-app/${p.id}`).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('Policy removed'); },
  });

  const childDevices = devices?.filter((d) => d.childProfileId === activeChildId) ?? [];

  function toggleDay(day: number) {
    setScheduleForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day],
    }));
  }

  const websiteBlocks = policies?.filter((p) => p.policyType === 'CONTENT_FILTER') ?? [];
  const otherPolicies = policies?.filter((p) => p.policyType !== 'CONTENT_FILTER') ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Controls</h1>
          <p className="page-subtitle">Manage restrictions and device access</p>
        </div>
        <select className="input w-auto" value={activeChildId} onChange={(e) => setChildId(e.target.value)}>
          {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device controls */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Device Controls</h2>
          {childDevices.length === 0 ? (
            <p className="text-sm text-gray-400">No devices paired for this child.</p>
          ) : (
            <div className="space-y-3">
              {childDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{device.deviceName}</p>
                    <p className="text-xs text-gray-500">{device.isLocked ? 'Currently locked' : 'Active'}</p>
                  </div>
                  {device.isLocked ? (
                    <button onClick={() => unlock.mutate(device.id)} className="flex items-center gap-1.5 btn-secondary text-sm">
                      <Unlock className="w-3.5 h-3.5" /> Unlock
                    </button>
                  ) : (
                    <button onClick={() => lock.mutate(device.id)} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100">
                      <Lock className="w-3.5 h-3.5" /> Lock
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { icon: <Globe className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-50', title: 'Block a website', desc: 'Prevent access to a domain', action: () => setShowBlockSite(true) },
              { icon: <Ban className="w-4 h-4 text-red-500" />, bg: 'bg-red-50', title: 'Block an app', desc: 'Prevent access to a specific app', action: () => setShowBlockApp(true) },
              { icon: <Calendar className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50', title: 'Add schedule', desc: 'Set study or sleep time windows', action: () => setShowSchedule(true) },
            ].map((item) => (
              <button key={item.title} onClick={item.action} className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 text-left transition-colors">
                <div className={`${item.bg} p-2 rounded-lg`}>{item.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <Plus className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocked websites */}
      {websiteBlocks.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Blocked Websites</h2>
          <div className="flex flex-wrap gap-2">
            {websiteBlocks.map((policy) => (
              <div key={policy.id} className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium">
                <Globe className="w-3.5 h-3.5" />
                <span>{policy.packageName}</span>
                <button onClick={() => removePolicy.mutate(policy)} className="hover:text-red-600 transition-colors ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other active policies */}
      {otherPolicies.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Active Policies</h2>
          <div className="space-y-2">
            {otherPolicies.map((policy) => {
              const badge = policyBadge[policy.policyType] ?? { label: policy.policyType, className: 'bg-gray-100 text-gray-700' };
              return (
                <div key={policy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
                    <span className="text-sm text-gray-900">
                      {policy.appName || `${policy.scheduleStart} – ${policy.scheduleEnd}`}
                    </span>
                    {policy.daysOfWeek?.length > 0 && policy.policyType === 'SCHEDULE' && (
                      <span className="text-xs text-gray-400">{policy.daysOfWeek.map((d) => DAYS[d]).join(', ')}</span>
                    )}
                  </div>
                  <button onClick={() => removePolicy.mutate(policy)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!policies?.length && (
        <div className="card text-center py-10">
          <Ban className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No active policies. Use Quick Actions above to add restrictions.</p>
        </div>
      )}

      {/* Block website modal */}
      {showBlockSite && (
        <Modal title="Block a website" onClose={() => setShowBlockSite(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Enter the domain to block. The child will see a warning if they try to visit it.</p>
            <div>
              <label className="label">Domain</label>
              <input className="input" placeholder="e.g. tiktok.com or youtube.com" value={siteForm.domain}
                onChange={(e) => setSiteForm({ domain: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBlockSite(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => blockSite.mutate({ childProfileId: activeChildId, domain: siteForm.domain })}
                disabled={blockSite.isPending || !siteForm.domain.trim()} className="btn-danger">
                {blockSite.isPending ? 'Blocking…' : 'Block website'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Block app modal */}
      {showBlockApp && (
        <Modal title="Block an app" onClose={() => setShowBlockApp(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">App name</label>
              <input className="input" placeholder="e.g. TikTok" value={appForm.appName}
                onChange={(e) => setAppForm((f) => ({ ...f, appName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Package name</label>
              <input className="input" placeholder="e.g. com.zhiliaoapp.musically" value={appForm.packageName}
                onChange={(e) => setAppForm((f) => ({ ...f, packageName: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBlockApp(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => blockApp.mutate({ childProfileId: activeChildId, ...appForm })}
                disabled={blockApp.isPending || !appForm.packageName || !appForm.appName} className="btn-danger">
                {blockApp.isPending ? 'Blocking…' : 'Block app'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule modal */}
      {showSchedule && (
        <Modal title="Add schedule" onClose={() => setShowSchedule(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start time</label>
                <input className="input" type="time" value={scheduleForm.scheduleStart}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduleStart: e.target.value }))} />
              </div>
              <div>
                <label className="label">End time</label>
                <input className="input" type="time" value={scheduleForm.scheduleEnd}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduleEnd: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Active days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      scheduleForm.daysOfWeek.includes(i) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'
                    }`}>{day}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSchedule(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => addSchedule.mutate({ childProfileId: activeChildId, ...scheduleForm })}
                disabled={addSchedule.isPending} className="btn-primary">
                {addSchedule.isPending ? 'Saving…' : 'Add schedule'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
