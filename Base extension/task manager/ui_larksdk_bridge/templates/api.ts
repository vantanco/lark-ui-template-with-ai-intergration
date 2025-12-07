import * as BitableSDK from '@lark-opdev/block-bitable-api';

// Wrapper helpers copied from alignflow OKR project (template version).
// Use these as a starting point to call Bitable SDK (create/update/link records, etc).

export const bitable: any =
  (BitableSDK as any).bitable ||
  (typeof globalThis !== 'undefined' ? (globalThis as any).bitable : undefined) ||
  {};
export const ViewType = (BitableSDK as any).ViewType;
export const FieldType = (BitableSDK as any).FieldType;

type FieldMeta = { id: string; name: string };

const warn = (...args: any[]) => console.warn('[lark-sdk]', ...args);
const optionIdCache = new Map<string, Map<string, string>>();

const withTimeout = async <T>(fn: () => Promise<T>, ms = 1500): Promise<T | null> => {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]) as any;
  } catch {
    return null;
  }
};

const normalizeId = (val: any) => (val ? String(val) : null);

export const getSelectionSafe = async () => {
  if (!bitable?.base) return null;
  try {
    return await bitable.base.getSelection();
  } catch (err) {
    warn('getSelectionSafe failed', err);
    return null;
  }
};

export const hasBitableBase = () => Boolean((bitable as any)?.base);

// Always resolve per session (no cache/local storage). Tries bridge first, then base, then window.lark.
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const bridge = (bitable as any)?.bridge;
    if (bridge) {
      const baseUid = normalizeId(await withTimeout(() => bridge.getBaseUserId?.()));
      if (baseUid) return baseUid;

      const ctx = await withTimeout(() => bridge.getContext?.());
      const ctxUid = normalizeId((ctx as any)?.userId || (ctx as any)?.user?.id);
      if (ctxUid) return ctxUid;

      const info = await withTimeout(() => bridge.getUserInfo?.());
      const infoUid = normalizeId((info as any)?.userId || (info as any)?.id);
      if (infoUid) return infoUid;
    }

    const base = (bitable as any)?.base;
    if (base) {
      const baseUid = normalizeId(await withTimeout(() => base.getUserId?.()));
      if (baseUid) return baseUid;

      const info = await withTimeout(() => base.getUserInfo?.());
      const infoUid = normalizeId((info as any)?.userId || (info as any)?.id);
      if (infoUid) return infoUid;
    }

    const winId = normalizeId((globalThis as any)?.lark?.env?.user?.id || (globalThis as any)?.CURRENT_USER_ID);
    if (winId) return winId;
    return null;
  } catch (err) {
    warn('getCurrentUserId failed', err);
    return null;
  }
};

export const getCurrentUserIdCached = async (): Promise<string | null> => getCurrentUserId();

export const resolveTableAndMetas = async () => {
  const selection = await getSelectionSafe();
  if (!selection?.tableId) throw new Error('No tableId in selection');
  const table = await bitable.base.getTableById(selection.tableId);
  const metas = await table.getFieldMetaList();
  return { table, metas, selection };
};

export const getFieldMetas = async (table: any) => {
  try {
    return await table.getFieldMetaList();
  } catch (err) {
    warn('getFieldMetas failed', err);
    return [];
  }
};

export const findFieldId = (metas: FieldMeta[], name: string) => {
  const meta = metas.find((m: any) => {
    const nm = typeof m.name === 'string' ? m.name.trim() : m.name;
    return nm === name;
  });
  return meta?.id;
};

const appendCreationLog = (entry: Record<string, any>) => {
  try {
    const key = 'CreationLog';
    const now = new Date();
    const line = JSON.stringify({
      timeISO: now.toISOString(),
      timeLocal: now.toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', hour12: false }),
      ...entry
    });
    const prev = localStorage.getItem(key) || '';
    const next = prev ? `${prev}\n${line}` : line;
    localStorage.setItem(key, next);
  } catch (_) {
    // ignore storage issues
  }
};

const extractRecordId = (res: any): string | undefined => {
  if (!res) return undefined;
  if (typeof res === 'string') return res;
  return res.recordId || res.record_id || res.id || res.data?.recordId || res.data?.record_id;
};

export const addRecordByFieldNames = async (fieldsByName: Record<string, any>): Promise<string | null> => {
  try {
    const { table, metas } = await resolveTableAndMetas();
    const fields: Record<string, any> = {};
    Object.entries(fieldsByName).forEach(([name, value]) => {
      const id = findFieldId(metas as any, name);
      if (id) fields[id] = value;
    });
    if (Object.keys(fields).length === 0) {
      warn('addRecordByFieldNames: no matching fields', Object.keys(fieldsByName));
      return null;
    }
    const res = await table.addRecord({ fields });
    const recordId = extractRecordId(res);
    return recordId || null;
  } catch (err) {
    warn('addRecordByFieldNames failed', err);
    return null;
  }
};

export const deleteRecordById = async (recordId: string): Promise<boolean> => {
  try {
    let selection = await getSelectionSafe();
    let tableId = selection?.tableId;
    if (!tableId) {
      const tableMetas = (await (bitable.base as any)?.getTableMetaList?.()) || [];
      tableId = tableMetas[0]?.id;
    }
    if (!tableId) throw new Error('No tableId to delete record');
    const table = await bitable.base.getTableById(tableId);
    if (typeof (table as any).deleteRecord === 'function') {
      await (table as any).deleteRecord(recordId);
    } else if (typeof (table as any).deleteRecords === 'function') {
      await (table as any).deleteRecords([recordId]);
    } else {
      throw new Error('deleteRecord API not available');
    }
    appendCreationLog({ step: 'delete-record', recordId, tableId, ok: true });
    return true;
  } catch (err) {
    appendCreationLog({ step: 'delete-record', recordId, ok: false, error: String(err) });
    warn('deleteRecordById failed', err);
    return false;
  }
};

// Simple helper to set single select by option name (with a fallback to option id)
export const setSingleSelectWithFallback = async (
  recordId: string,
  fieldName: string,
  optionName: string,
  log?: (payload: Record<string, any>) => void,
): Promise<void> => {
  try {
    const ctx = await getTableFromSelection();
    if (!ctx) return;
    const { table } = ctx;
    const fieldId = await table.getFieldIdByName(fieldName);
    if (!fieldId) {
      log?.({ action: 'set-select-miss-field', fieldName });
      return;
    }
    log?.({ action: 'set-select', recordId, fieldName, optionName });
    const okByName = await table.setCellValue(fieldId, recordId, optionName);
    log?.({ action: 'set-select-result', recordId, ok: okByName });

    const currentVal = await table.getCellValue(fieldId, recordId);
    if (!currentVal || (Array.isArray(currentVal) && currentVal.length === 0)) {
      const optId = await getSingleSelectOptionId(table, fieldId, optionName, log);
      if (optId) {
        log?.({ action: 'set-select-fallback', recordId, optionId: optId });
        await table.setCellValue(fieldId, recordId, { id: optId });
      }
    }
  } catch (err) {
    log?.({ action: 'set-select-error', error: String(err) });
    warn('setSingleSelectWithFallback failed', err);
  }
};

export const getSingleSelectOptionId = async (
  table: any,
  fieldId: string,
  optionName: string,
  log?: (payload: Record<string, any>) => void,
): Promise<string | null> => {
  const normalized = optionName.trim().toLowerCase();
  const cached = optionIdCache.get(fieldId);
  if (cached?.has(normalized)) return cached.get(normalized)!;
  try {
    const field = await table.getFieldById(fieldId);
    if (field?.getOptions) {
      const opts = await field.getOptions();
      const matched = opts?.find((o: any) => (o.name || o.text || '').trim().toLowerCase() === normalized);
      if (matched?.id) {
        if (!optionIdCache.has(fieldId)) optionIdCache.set(fieldId, new Map());
        optionIdCache.get(fieldId)!.set(normalized, matched.id);
        return matched.id;
      }
      log?.({ action: 'option-not-found', fieldId, optionName, available: opts?.map((o: any) => o.name || o.text) });
    }
  } catch (err) {
    log?.({ action: 'fetch-option-error', fieldId, optionName, error: String(err) });
  }
  return null;
};

export const getTableFromSelection = async () => {
  const selection = await getSelectionSafe();
  if (!selection?.tableId) return null;
  const table = await bitable.base.getTableById(selection.tableId);
  return { table, selection };
};

export const getRecordLink = async (recordId: string): Promise<string | null> => {
  if (!bitable?.base) return null;
  try {
    let selection = await getSelectionSafe();
    let tableId = selection?.tableId;
    if (!tableId) {
      const tableMetas = (await (bitable.base as any)?.getTableMetaList?.()) || [];
      tableId = tableMetas[0]?.id;
    }
    if (!tableId) return null;
    const table = await bitable.base.getTableById(tableId);
    let viewId = selection?.viewId;
    if (!viewId) {
      const metas = await table.getViewMetaList();
      viewId = metas?.[0]?.id;
    }
    if (!viewId) return null;
    if (typeof (bitable.base as any).getBitableUrl === 'function') {
      const url = await (bitable.base as any).getBitableUrl({
        tableId,
        viewId,
        recordId,
      });
      return url || null;
    }
    return null;
  } catch (err) {
    warn('getRecordLink failed', err);
    return null;
  }
};

// -------------------------------
// Debug helper: fetch a sample record from current selection
// -------------------------------

const toText = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val)) return val.map((v) => toText(v)).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    if ('text' in val) return toText((val as any).text);
    if ('name' in val) return toText((val as any).name);
    if ('id' in val) return String((val as any).id);
    return JSON.stringify(val);
  }
  return String(val);
};

export const fetchCurrentRecordSample = async () => {
  if (!bitable?.base) throw new Error('bitable SDK not found');
  const selection = await getSelectionSafe();
  if (!selection?.tableId) throw new Error('No tableId in selection');

  const table = await bitable.base.getTableById(selection.tableId);
  const viewMetas = await table.getViewMetaList();
  const viewMeta =
    (selection.viewId && viewMetas.find((v: any) => v.id === selection.viewId)) ||
    viewMetas.find((v: any) => v.type === ViewType.Grid) ||
    viewMetas[0];
  if (!viewMeta) throw new Error('No view found');

  const view = await table.getViewById(viewMeta.id);
  const fields = await view.getFieldMetaList();
  const recordIds = await view.getVisibleRecordIdList();
  const recordId = selection.recordId || recordIds[0];
  if (!recordId) throw new Error('No recordId available in view');

  const data: Record<string, any> = { recordId };
  for (const f of fields) {
    const val = await table.getCellValue(f.id, recordId);
    data[typeof f.name === 'string' ? f.name : f.id] = toText(val);
  }
  return { selection, viewMeta, fields: fields.map((f: any) => ({ id: f.id, name: f.name, type: f.type })), data };
};
