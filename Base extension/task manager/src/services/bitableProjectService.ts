import { bitable } from '@lark-opdev/block-bitable-api';
import { Project } from '../types';

// Helper: convert any cell value to string
function toText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return val.map((v) => toText(v)).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    if (val && val.text !== undefined) return toText(val.text);
    if (val && val.name !== undefined) return toText(val.name);
    if (val && val.id !== undefined) return String(val.id);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function normalizeDateString(raw: string): string {
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 1e11) {
    try {
      return new Date(num).toISOString().slice(0, 10);
    } catch {
      return raw;
    }
  }
  return raw;
}

// Fetch data directly from the current Bitable table instead of CSV
export const fetchProjectsFromBitable = async (): Promise<Project[]> => {
  if (!bitable?.base) {
    throw new Error('Bitable SDK not available');
  }

  const selection = await bitable.base.getSelection();
  if (!selection?.tableId) {
    throw new Error('No tableId in selection. Open the block inside a table.');
  }

  const table = await bitable.base.getTableById(selection.tableId);
  const metas = await table.getFieldMetaList();
  const fieldIdByName = (name: string) => {
    const meta = metas.find((m) => (typeof m.name === 'string' ? m.name.trim() : m.name) === name);
    return meta?.id;
  };

  const idField = fieldIdByName('id') || fieldIdByName('ID');
  const nameField = fieldIdByName('name') || fieldIdByName('Name') || fieldIdByName('Task');
  const statusField = fieldIdByName('status') || fieldIdByName('Status');
  const priorityField = fieldIdByName('priority') || fieldIdByName('Priority');
  const ownerField = fieldIdByName('owner') || fieldIdByName('Owner');
  const budgetField = fieldIdByName('budget') || fieldIdByName('Budget');
  const startDateField = fieldIdByName('startDate') || fieldIdByName('Start Date');
  const dueDateField = fieldIdByName('dueDate') || fieldIdByName('Due Date');
  const descField = fieldIdByName('description') || fieldIdByName('Description');

  const recordIds = await table.getRecordIdList();
  const projects: Project[] = [];

  for (const rid of recordIds) {
    const rawId = idField ? await table.getCellValue(idField, rid) : rid;
    const projectId = toText(rawId) || rid;
    const name = toText(nameField ? await table.getCellValue(nameField, rid) : '');
    const statusText = toText(statusField ? await table.getCellValue(statusField, rid) : '');
    const status = (['Pending', 'In Progress', 'Completed', 'Blocked'].includes(statusText)
      ? statusText
      : 'Pending') as Project['status'];
    const priorityText = toText(priorityField ? await table.getCellValue(priorityField, rid) : '');
    const priority = (['Low', 'Medium', 'High', 'Critical'].includes(priorityText)
      ? priorityText
      : 'Medium') as Project['priority'];
    const owner = toText(ownerField ? await table.getCellValue(ownerField, rid) : '');
    const budgetRaw = toText(budgetField ? await table.getCellValue(budgetField, rid) : '');
    const budget = Number(budgetRaw) || 0;
    const startDateRaw = toText(startDateField ? await table.getCellValue(startDateField, rid) : '');
    const dueDateRaw = toText(dueDateField ? await table.getCellValue(dueDateField, rid) : '');
    const startDate = startDateRaw ? normalizeDateString(startDateRaw) : '';
    const dueDate = dueDateRaw ? normalizeDateString(dueDateRaw) : '';
    const description = toText(descField ? await table.getCellValue(descField, rid) : '');

    projects.push({
      id: projectId,
      name: name || '(No title)',
      status,
      priority,
      owner: owner || 'Unassigned',
      budget,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      description,
      comments: [],
      subtasks: [],
    });
  }

  return projects;
};
