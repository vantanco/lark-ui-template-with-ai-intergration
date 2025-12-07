import { bitable } from '@lark-opdev/block-bitable-api';

// Subscribe to record/field changes in the current table.
// Returns a disposer function to unsubscribe all listeners.
export function subscribeRecordChanges(options = {}) {
  const { onRecords, onSchema, onError } = options;

  if (!bitable || !bitable.base) {
    onError && onError(new Error('Bitable SDK not available'));
    return () => {};
  }

  const disposers = [];

  const extractIds = (evt) => {
    const ids = [];
    if (evt && evt.recordId) ids.push(evt.recordId);
    if (evt && Array.isArray(evt.recordIds)) ids.push(...evt.recordIds);
    if (evt && evt.data && evt.data.recordId) ids.push(evt.data.recordId);
    if (evt && evt.data && Array.isArray(evt.data.recordIds)) ids.push(...evt.data.recordIds);
    return ids;
  };

  const safeBind = (methodName, handler) => {
    try {
      const fn = bitable.base[methodName];
      if (typeof fn !== 'function') return;
      const off = fn.call(bitable.base, handler);
      if (typeof off === 'function') disposers.push(off);
    } catch (err) {
      onError && onError(err);
    }
  };

  // Base-level listeners
  ['onRecordAdd', 'onRecordModify', 'onRecordDelete'].forEach((method) => {
    safeBind(method, (evt) => {
      const ids = extractIds(evt);
      onRecords && onRecords({ type: method, ids, event: evt });
    });
  });

  ['onFieldAdd', 'onFieldModify'].forEach((method) => {
    safeBind(method, (evt) => {
      onSchema && onSchema({ type: method, event: evt });
    });
  });

  // Table-level listeners (if supported by SDK)
  (async () => {
    try {
      const selection = await bitable.base.getSelection();
      if (!selection || !selection.tableId) return;
      const table = await bitable.base.getTableById(selection.tableId);
      const bindTable = (method) => {
        try {
          const fn = table[method];
          if (typeof fn !== 'function') return;
          const off = fn.call(table, (evt) => {
            const ids = extractIds(evt);
            if (method === 'onFieldModify' || method === 'onFieldAdd') {
              onSchema && onSchema({ type: `table:${method}`, event: evt });
            } else {
              onRecords && onRecords({ type: `table:${method}`, ids, event: evt });
            }
          });
          if (typeof off === 'function') disposers.push(off);
        } catch (err) {
          onError && onError(err);
        }
      };
      ['onRecordAdd', 'onRecordModify', 'onRecordDelete', 'onFieldAdd', 'onFieldModify'].forEach(bindTable);
    } catch (err) {
      onError && onError(err);
    }
  })();

  return () => {
    disposers.forEach((off) => {
      try {
        off();
      } catch (_e) {
        /* ignore */
      }
    });
  };
}
