import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkAuth, AuthRequest } from '../middleware/checkAuth';

const router = Router();

const MAX_PRICE = 999_999;

const PriceListSchema = z.object({
  materialPvc:        z.number().positive().max(MAX_PRICE),
  materialScreen:     z.number().positive().max(MAX_PRICE),
  materialOxford:     z.number().positive().max(MAX_PRICE),
  materialFabric:     z.number().positive().max(MAX_PRICE),
  moskit:             z.number().positive().max(MAX_PRICE),
  pocket:             z.number().positive().max(MAX_PRICE),
  extraLockRotary:    z.number().positive().max(MAX_PRICE),
  extraLockFrench:    z.number().positive().max(MAX_PRICE),
  extraZipperSpiral:  z.number().positive().max(MAX_PRICE),
  extraZipperTractor: z.number().positive().max(MAX_PRICE),
  glassTint:          z.number().positive().max(100),
  install:            z.number().positive().max(MAX_PRICE),
});

router.get('/prices', checkAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const prices = await prisma.priceList.findUnique({
    where: { userId: req.userId! },
  });
  if (!prices) {
    res.status(404).json({ error: 'Прайс-лист не найден' });
    return;
  }
  res.json({ prices });
});

router.put('/prices', checkAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = PriceListSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' });
    return;
  }
  const prices = await prisma.priceList.update({
    where: { userId: req.userId! },
    data: parsed.data,
  });
  res.json({ prices });
});

export default router;
