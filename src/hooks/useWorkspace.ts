import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restGet, restInsert, restUpdate, restDelete } from '@/lib/supabase';
import type { WorkspaceTask, WorkspaceMaterial } from '@/types/domain';

async function safe<T>(label: string, p: Promise<T[]>): Promise<T[]> {
  const start = performance.now();
  try {
    const rows = await p;
    console.info(
      `[REST] ${label} OK em ${Math.round(performance.now() - start)}ms (${rows.length} rows)`,
    );
    return rows;
  } catch (err) {
    console.warn(`[REST] ${label} falhou:`, (err as Error).message);
    return [];
  }
}

// ============================================================================
// Tasks
// ============================================================================
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  priority: WorkspaceTask['priority'];
  status: WorkspaceTask['status'];
  due_date: string | null;
  related_student_id: string | null;
  related_lead_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
};

const mapTask = (r: TaskRow): WorkspaceTask => ({
  id: r.id,
  title: r.title,
  description: r.description,
  assignedTo: r.assigned_to,
  priority: r.priority,
  status: r.status,
  dueDate: r.due_date,
  relatedStudentId: r.related_student_id,
  relatedLeadId: r.related_lead_id,
  createdBy: r.created_by,
  createdAt: r.created_at,
  completedAt: r.completed_at,
});

export function useTasks() {
  return useQuery({
    queryKey: ['workspace_tasks'],
    queryFn: async (): Promise<WorkspaceTask[]> => {
      const rows = await safe<TaskRow>(
        'workspace_tasks',
        restGet<TaskRow[]>(
          'workspace_tasks?select=*&order=due_date.asc.nullslast,created_at.desc',
        ),
      );
      return rows.map(mapTask);
    },
  });
}

export function useUpsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<WorkspaceTask> & { title: string }) => {
      const payload: Record<string, unknown> = {
        title: t.title,
        description: t.description ?? null,
        assigned_to: t.assignedTo ?? null,
        priority: t.priority ?? 'media',
        status: t.status ?? 'pending',
        due_date: t.dueDate ?? null,
        related_student_id: t.relatedStudentId ?? null,
        related_lead_id: t.relatedLeadId ?? null,
      };
      if (t.status === 'done' && !t.completedAt) {
        payload.completed_at = new Date().toISOString();
      } else if (t.status && t.status !== 'done') {
        payload.completed_at = null;
      }
      if (t.id) return restUpdate('workspace_tasks', `id=eq.${t.id}`, payload);
      if (t.createdBy) payload.created_by = t.createdBy;
      return restInsert('workspace_tasks', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace_tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('workspace_tasks', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace_tasks'] }),
  });
}

export function useToggleTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: WorkspaceTask['status'] }) => {
      const payload: Record<string, unknown> = { status: vars.status };
      payload.completed_at = vars.status === 'done' ? new Date().toISOString() : null;
      return restUpdate('workspace_tasks', `id=eq.${vars.id}`, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace_tasks'] }),
  });
}

// ============================================================================
// Materials
// ============================================================================
type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  category: WorkspaceMaterial['category'];
  url: string | null;
  body: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const mapMaterial = (r: MaterialRow): WorkspaceMaterial => ({
  id: r.id,
  title: r.title,
  description: r.description,
  category: r.category,
  url: r.url,
  body: r.body,
  tags: r.tags ?? [],
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function useMaterials() {
  return useQuery({
    queryKey: ['workspace_materials'],
    queryFn: async (): Promise<WorkspaceMaterial[]> => {
      const rows = await safe<MaterialRow>(
        'workspace_materials',
        restGet<MaterialRow[]>(
          'workspace_materials?select=*&order=updated_at.desc',
        ),
      );
      return rows.map(mapMaterial);
    },
  });
}

export function useUpsertMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<WorkspaceMaterial> & { title: string }) => {
      const payload: Record<string, unknown> = {
        title: m.title,
        description: m.description ?? null,
        category: m.category ?? 'outros',
        url: m.url ?? null,
        body: m.body ?? null,
        tags: m.tags ?? [],
        updated_at: new Date().toISOString(),
      };
      if (m.id) return restUpdate('workspace_materials', `id=eq.${m.id}`, payload);
      if (m.createdBy) payload.created_by = m.createdBy;
      return restInsert('workspace_materials', payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace_materials'] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => restDelete('workspace_materials', `id=eq.${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace_materials'] }),
  });
}
