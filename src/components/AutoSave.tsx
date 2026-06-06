import { useEffect, useRef } from 'react';
import { useConstructorStore } from '../store/constructorStore';
import { useOrdersStore } from '../store/ordersStore';

export function AutoSave() {
  const activeOrderId = useOrdersStore((s) => s.activeOrderId);
  const saveCurrentOrder = useOrdersStore((s) => s.saveCurrentOrder);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Single string key from all saveable constructor fields
  const key = useConstructorStore((s) =>
    [
      s.prodType, s.shape, s.width, s.height,
      s.material, s.color, s.glass, s.openingType,
      s.moskit, s.pocket, s.install,
      s.extraLockType, s.extraLockCount,
      s.extraZipperType, s.extraZipperLen,
      s.extraWorkPrice,
      s.okantovkaTop, s.okantovkaBottom, s.okantovkaLeft, s.okantovkaRight,
    ].join(',')
  );

  useEffect(() => {
    if (!activeOrderId) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveCurrentOrder, 800);
    return () => clearTimeout(timerRef.current);
  }, [key, activeOrderId]);

  return null;
}
