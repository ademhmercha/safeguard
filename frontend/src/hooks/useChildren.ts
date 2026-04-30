import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export interface Child {
  id: string;
  name: string;
  age: number;
  avatarUrl?: string;
  dailyScreenLimit: number;
  bedtimeStart?: string;
  bedtimeEnd?: string;
  isActive: boolean;
  devices: { id: string; deviceName: string; isLocked: boolean; lastSeen: string }[];
}

export function useChildren() {
  return useQuery<Child[]>({
    queryKey: ['children'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });
}

export function useChild(id: string) {
  return useQuery<Child>({
    queryKey: ['children', id],
    queryFn: () => api.get(`/children/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Child>) => api.post('/children', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] });
      toast.success('Child profile created');
    },
    onError: () => toast.error('Failed to create child profile'),
  });
}

export function useUpdateChild(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Child>) => api.put(`/children/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] });
      toast.success('Child profile updated');
    },
    onError: () => toast.error('Failed to update child profile'),
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/children/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] });
      toast.success('Child profile deleted');
    },
    onError: () => toast.error('Failed to delete child profile'),
  });
}
