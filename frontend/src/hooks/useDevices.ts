import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export interface Device {
  id: string;
  childProfileId: string;
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  isLocked: boolean;
  lastSeen?: string;
  isActive: boolean;
  childProfile: { name: string };
}

export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then((r) => r.data),
  });
}

export function useLockDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => api.post(`/control/lock/${deviceId}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); toast.success('Device locked'); },
    onError: () => toast.error('Failed to lock device'),
  });
}

export function useUnlockDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => api.post(`/control/unlock/${deviceId}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); toast.success('Device unlocked'); },
    onError: () => toast.error('Failed to unlock device'),
  });
}

export function useGeneratePairingCode() {
  return useMutation({
    mutationFn: (childProfileId: string) =>
      api.post('/devices/generate-pairing-code', { childProfileId }).then((r) => r.data),
  });
}
