import * as BitableSDK from '@lark-opdev/block-bitable-api';

// Plain JS wrappers (no TS/optional chaining) for Bitable SDK
const sdk = BitableSDK || {};
export const bitable =
  sdk.bitable ||
  (typeof globalThis !== 'undefined' && globalThis && globalThis.bitable) ||
  {};
export const ViewType = sdk.ViewType;
export const FieldType = sdk.FieldType;

const warn = (...args) => console.warn('[lark-sdk]', ...args);
const optionIdCache = new Map();

const withTimeout = async (fn, ms = 1500) => {
  try {
    return await Promise.race([
      fn(),
      new Promise((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
};

const normalizeId = (val) => (val ? String(val) : null);

export const getSelectionSafe = async () => {
  if (!bitable || !bitable.base || typeof bitable.base.getSelection !== 'function') return null;
  try {
    return await bitable.base.getSelection();
  } catch (err) {
    warn('getSelectionSafe failed', err);
    return null;
  }
};

export const hasBitableBase = () => Boolean(bitable && bitable.base);

export const getCurrentUserId = async () => {
  try {
    const bridge = bitable && bitable.bridge;
    if (bridge) {
      const baseUid = normalizeId(await withTimeout(() => bridge.getBaseUserId ? bridge.getBaseUserId() : Promise.resolve(null)));
      if (baseUid) return baseUid;
      const ctx = await withTimeout(() => bridge.getContext ? bridge.getContext() : Promise.resolve(null));
      const ctxUid = normalizeId(ctx && (ctx.userId || (ctx.user && ctx.user.id)));
      if (ctxUid) return ctxUid;
      const info = await withTimeout(() => bridge.getUserInfo ? bridge.getUserInfo() : Promise.resolve(null));
      const infoUid = normalizeId(info && (info.userId || info.id));
      if (infoUid) return infoUid;
    }
    const base = bitable && bitable.base;
    if (base) {
      const baseUid = normalizeId(await withTimeout(() => base.getUserId ? base.getUserId() : Promise.resolve(null)));
      if (baseUid) return baseUid;
      const info = await withTimeout(() => base.getUserInfo ? base.getUserInfo() : Promise.resolve(null));
      const infoUid = normalizeId(info && (info.userId || info.id));
      if (infoUid) return infoUid;
    }
    const winId = normalizeId((globalThis && globalThis.lark && globalThis.lark.env && globalThis.lark.env.user && globalThis.lark.env.user.id) || (globalThis && globalThis.CURRENT_USER_ID));
    if (winId) return winId;
    return null;
  } catch (err) {
    warn('getCurrentUserId failed', err);
    return null;
  }
};

export const getCurrentUserIdCached = async () => getCurrentUserId();

export const resolveTableAndMetas = async () => {
  const selection = await getSelectionSafe();
  if (!selection || !selection.tableId) throw new Error('No tableId in selection');
  const table = await bitable.base.getTableById(selection.tableId);
  const metas = await table.getFieldMetaList();
  return { table, metas, selection };
};

export const getFieldMetas = async (table) => {
  try {
    return await table.getFieldMetaList();
  } catch (err) {
    warn('getFieldMetas failed', err);
    return [];
  }
};

export const findFieldId = (metas, name) => {
  const meta = metas.find((m) => {
    const nm = typeof m.name === 'string' ? m.name.trim() : m.name;
    return nm === name;
  });
  return meta ? meta.id : undefined;
};

const appendCreationLog = (entry) => {
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
    // ignore storage errors
  }
};

const extractRecordId = (res) => {
  if (!res) return undefined;
  if (typeof res === 'string') return res;
  return res.recordId || res.record_id || res.id || (res.data && (res.data.recordId || res.data.record_id));
};

export const addRecordByFieldNames = async (fieldsByName) => {
  try {
    const { table, metas } = await resolveTableAndMetas();
    const fields = {};
    Object.keys(fieldsByName).forEach((name) => {
      const value = fieldsByName[name];
      const id = findFieldId(metas, name);
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

export const deleteRecordById = async (recordId) => {
  try {
    let selection = await getSelectionSafe();
    let tableId = selection && selection.tableId;
    if (!tableId) {
      const tableMetas = bitable.base && typeof bitable.base.getTableMetaList === 'function' ? await bitable.base.getTableMetaList() : [];
      tableId = tableMetas[0] && tableMetas[0].id;
    }
    if (!tableId) throw new Error('No tableId to delete record');
    const table = await bitable.base.getTableById(tableId);
    if (table && typeof table.deleteRecord === 'function') {
      await table.deleteRecord(recordId);
    } else if (table && typeof table.deleteRecords === 'function') {
      await table.deleteRecords([recordId]);
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

const isEmptySingleSelectValue = (val) => {
  if (val === null || val === undefined) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'string') return val.trim().length === 0;
  if (typeof val === 'object') {
    const text = (val && (val.text || val.name)) || '';
    return !text;
  }
  return false;
};

export const getSingleSelectOptionId = async (table, fieldId, optionName, log) => {
  const normalized = optionName.trim().toLowerCase();
  const cached = optionIdCache.get(fieldId);
  if (cached && cached.has(normalized)) return cached.get(normalized);
  try {
    const field = await table.getFieldById(fieldId);
    if (field && field.getOptions) {
      const opts = await field.getOptions();
      const matched = opts && opts.find((o) => ((o.name || o.text || '').trim().toLowerCase() === normalized));
      if (matched && matched.id) {
        if (!optionIdCache.has(fieldId)) optionIdCache.set(fieldId, new Map());
        optionIdCache.get(fieldId).set(normalized, matched.id);
        return matched.id;
      }
      log && log({ action: 'option-not-found', fieldId, optionName, available: opts ? opts.map((o) => o.name || o.text) : [] });
    }
  } catch (err) {
    log && log({ action: 'fetch-option-error', fieldId, optionName, error: String(err) });
  }
  return null;
};

export const setSingleSelectWithFallback = async (recordId, fieldName, optionName, log) => {
  try {
    const ctx = await getTableFromSelection();
    if (!ctx) return;
    const table = ctx.table;
    const fieldId = await table.getFieldIdByName(fieldName);
    if (!fieldId) {
      log && log({ action: 'set-select-miss-field', fieldName });
      return;
    }
    log && log({ action: 'set-select', recordId, fieldName, optionName });
    const okByName = await table.setCellValue(fieldId, recordId, optionName);
    log && log({ action: 'set-select-result', recordId, ok: okByName });

    const currentVal = await table.getCellValue(fieldId, recordId);
    if (isEmptySingleSelectValue(currentVal)) {
      const optId = await getSingleSelectOptionId(table, fieldId, optionName, log);
      if (optId) {
        log && log({ action: 'set-select-fallback', recordId, optionId: optId });
        await table.setCellValue(fieldId, recordId, { id: optId });
      }
    }
  } catch (err) {
    log && log({ action: 'set-select-error', error: String(err) });
    warn('setSingleSelectWithFallback failed', err);
  }
};

export const getTableFromSelection = async () => {
  const selection = await getSelectionSafe();
  if (!selection || !selection.tableId) return null;
  const table = await bitable.base.getTableById(selection.tableId);
  return { table, selection };
};

export const getRecordLink = async (recordId) => {
  if (!bitable || !bitable.base) return null;
  try {
    let selection = await getSelectionSafe();
    let tableId = selection && selection.tableId;
    if (!tableId) {
      const tableMetas = bitable.base && typeof bitable.base.getTableMetaList === 'function' ? await bitable.base.getTableMetaList() : [];
      tableId = tableMetas[0] && tableMetas[0].id;
    }
    if (!tableId) return null;
    const table = await bitable.base.getTableById(tableId);
    let viewId = selection && selection.viewId;
    if (!viewId) {
      const metas = await table.getViewMetaList();
      viewId = metas && metas[0] && metas[0].id;
    }
    if (!viewId) return null;
    if (bitable.base && typeof bitable.base.getBitableUrl === 'function') {
      const url = await bitable.base.getBitableUrl({
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
