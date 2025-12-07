import { bitable, ViewType } from '@lark-opdev/block-bitable-api';

// Convert any cell value to a readable string
function toText(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val
      .map(function (v) { return toText(v); })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object') {
    if (val && val.text !== undefined) return toText(val.text);
    if (val && val.name !== undefined) return toText(val.name);
    if (val && val.id !== undefined) return String(val.id);
    try {
      return JSON.stringify(val);
    } catch (_err) {
      return String(val);
    }
  }
  return String(val);
}

// Debug helper: read the current record (or first record) from the active view
export async function fetchCurrentRecordSample() {
  if (!bitable || !bitable.base) throw new Error('bitable SDK not found');

  const selection = await bitable.base.getSelection();
  if (!selection || !selection.tableId) throw new Error('No tableId in selection');

  const table = await bitable.base.getTableById(selection.tableId);
  // Làm việc trực tiếp với bảng (không lấy qua view)
  const fields = await table.getFieldMetaList();
  let recordIds = [];
  try {
    recordIds = await table.getRecordIdList();
  } catch (err) {
    // fallback nếu API không có
    recordIds = [];
  }
  const recordId = selection.recordId || (recordIds && recordIds[0]);
  if (!recordId) throw new Error('No recordId available in table');

  const data = { recordId: recordId };
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const val = await table.getCellValue(f.id, recordId);
    const key = typeof f.name === 'string' ? f.name : f.id;
    data[key] = toText(val);
  }

  const fieldsLite = fields.map(function (f) {
    return { id: f.id, name: f.name, type: f.type };
  });

  return { selection: selection, fields: fieldsLite, data: data };
}
