import { useEffect, useState } from 'react';
import { bitable } from '@lark-opdev/block-bitable-api';

type BridgeContext = Awaited<ReturnType<typeof bitable.bridge.getContext>>;
type Selection = Awaited<ReturnType<typeof bitable.base.getSelection>>;

export function useBitableContext() {
  const [context, setContext] = useState<BridgeContext>();
  const [selection, setSelection] = useState<Selection>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    async function bootstrap() {
      try {
        const ctx = await bitable.bridge.getContext();
        if (!disposed) setContext(ctx);

        const sel = await bitable.base.getSelection();
        if (!disposed) setSelection(sel);
      } catch (err) {
        if (!disposed) setError(err as Error);
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void bootstrap();

    const offSelection = bitable.base.onSelectionChange?.((next) => {
      setSelection(next);
    });

    return () => {
      disposed = true;
      offSelection?.();
    };
  }, []);

  return { context, selection, error, loading };
}

