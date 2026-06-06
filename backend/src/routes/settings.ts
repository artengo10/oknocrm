import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkAuth, AuthRequest } from '../middleware/checkAuth';

const router = Router();

const PriceListSchema = z.object({
  materialPvc:        z.number().positive(),
  materialScreen:     z.number().positive(),
  materialOxford:     z.number().positive(),
  moskit:             z.number().positive(),
  pocket:             z.number().positive(),
  extraLockRotary:    z.number().positive(),
  extraLockFrench:    z.number().positive(),
  extraZipperSpiral:  z.number().positive(),
  extraZipperTractor: z.number().positive(),
  glassTint:          z.number().positive(),
  install:            z.number().positive(),
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
