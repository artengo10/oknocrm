import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkAuth, AuthRequest } from '../middleware/checkAuth';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Пароль минимум 8 символов'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email уже зарегистрирован' });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hash, priceList: { create: {} } },
  });

  // Auto-create first order with default item
  await prisma.order.create({
    data: {
      userId: user.id,
      orderNum: 1,
      status: 'novy',
      items: {
        create: {
          prodType: 'window',
          shape: 'rect',
          material: 'pvc',
          color: 'brown',
          glass: 'clear',
          opening: 'Поворотные скобы (пластик)',
          width: 150,
          height: 200,
          moskit: false,
          pocket: false,
          install: false,
          okantovkaTop: 70,
          okantovkaBottom: 70,
          okantovkaLeft: 70,
          okantovkaRight: 70,
        },
      },
    },
  });

  const token = signToken(user.id);
  res.status(201).json({ user: { id: user.id, email: user.email }, token });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const token = signToken(user.id);
  res.json({ user: { id: user.id, email: user.email }, token });
});

router.get('/me', checkAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return;
  }
  res.json({ user });
});

export default router;
