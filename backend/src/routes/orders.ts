import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkAuth, AuthRequest } from '../middleware/checkAuth';

const router = Router();
router.use(checkAuth);

const PROD_TYPES    = ['window', 'door'] as const;
const SHAPES        = ['rect', 'square', 'arch', 'triangle'] as const;
const MATERIALS     = ['pvc', 'screen', 'oxford', 'fabric'] as const;
const COLORS        = ['brown', 'white', 'gray', 'beige', 'black', 'blue'] as const;
const GLASS_TYPES   = ['clear', 'tinted'] as const;
const STATUSES      = ['novy', 'v_rabote', 'gotov', 'otgr'] as const;

const ItemSchema = z.object({
  prodType:        z.enum(PROD_TYPES),
  shape:           z.enum(SHAPES),
  material:        z.enum(MATERIALS),
  color:           z.enum(COLORS),
  glass:           z.enum(GLASS_TYPES),
  opening:         z.string().min(1).max(120),
  width:           z.number().int().min(1).max(2000),
  height:          z.number().int().min(1).max(2000),
  moskit:          z.boolean(),
  pocket:          z.boolean(),
  install:         z.boolean(),
  extraLockType:   z.string().max(40).nullable().optional(),
  extraLockCount:  z.number().int().min(0).max(100).nullable().optional(),
  extraZipperType: z.string().max(40).nullable().optional(),
  extraZipperLen:  z.number().int().min(0).max(5000).nullable().optional(),
  okantovkaTop:    z.number().int().min(0).max(500),
  okantovkaBottom: z.number().int().min(0).max(500),
  okantovkaLeft:   z.number().int().min(0).max(500),
  okantovkaRight:  z.number().int().min(0).max(500),
  extraWorkPrice:  z.number().min(0).max(9_999_999).nullable().optional(),
  extraWorkDesc:   z.string().max(500).nullable().optional(),
  totalPrice:      z.number().min(0).max(9_999_999).nullable().optional(),
});

const StatusSchema = z.object({
  status: z.enum(STATUSES),
});

interface OrderItemRow {
  id: string;
  prodType: string;
  shape: string;
  material: string;
  color: string;
  glass: string;
  opening: string;
  width: number;
  height: number;
  moskit: boolean;
  pocket: boolean;
  install: boolean;
  extraLockType: string | null;
  extraLockCount: number | null;
  extraZipperType: string | null;
  extraZipperLen: number | null;
  extraWorkPrice: number | null;
  extraWorkDesc: string | null;
  okantovkaTop: number;
  okantovkaBottom: number;
  okantovkaLeft: number;
  okantovkaRight: number;
  totalPrice: number | null;
}

interface OrderRow {
  id: string;
  orderNum: number;
  status: string;
  createdAt: Date;
  clientId: string | null;
  items: OrderItemRow[];
}

function serializeOrder(order: OrderRow) {
  const item = order.items[0] ?? null;
  return {
    id:        order.id,
    orderNum:  order.orderNum,
    status:    order.status,
    createdAt: order.createdAt,
    clientId:  order.clientId ?? null,
    item: item ? {
      id:              item.id,
      prodType:        item.prodType,
      shape:           item.shape,
      material:        item.material,
      color:           item.color,
      glass:           item.glass,
      opening:         item.opening,
      width:           item.width,
      height:          item.height,
      moskit:          item.moskit,
      pocket:          item.pocket,
      install:         item.install,
      extraLockType:   item.extraLockType,
      extraLockCount:  item.extraLockCount,
      extraZipperType: item.extraZipperType,
      extraZipperLen:  item.extraZipperLen,
      extraWorkPrice:  item.extraWorkPrice,
      extraWorkDesc:   item.extraWorkDesc,
      okantovkaTop:    item.okantovkaTop,
      okantovkaBottom: item.okantovkaBottom,
      okantovkaLeft:   item.okantovkaLeft,
      okantovkaRight:  item.okantovkaRight,
      totalPrice:      item.totalPrice,
    } : null,
  };
}

// GET /api/orders — list all orders for the user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const orders = await prisma.order.findMany({
    where:   { userId: req.userId! },
    include: { items: { take: 1 } },
    orderBy: { orderNum: 'asc' },
  });
  res.json({ orders: orders.map(serializeOrder) });
});

// POST /api/orders — create a new order
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const last = await prisma.order.findFirst({
    where:   { userId: req.userId! },
    orderBy: { orderNum: 'desc' },
    select:  { orderNum: true },
  });
  const nextNum = (last?.orderNum ?? 0) + 1;

  const order = await prisma.order.create({
    data: {
      userId:   req.userId!,
      orderNum: nextNum,
      status:   'novy',
      items: {
        create: {
          prodType: 'window', shape: 'rect', material: 'pvc',
          color: 'brown', glass: 'clear',
          opening: 'Поворотные скобы (пластик)',
          width: 150, height: 200,
          moskit: false, pocket: false, install: false,
          okantovkaTop: 70, okantovkaBottom: 70, okantovkaLeft: 70, okantovkaRight: 70,
        },
      },
    },
    include: { items: { take: 1 } },
  });

  res.status(201).json({ order: serializeOrder(order) });
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = StatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Недопустимый статус' });
    return;
  }
  const orderId = req.params['id'] as string;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: req.userId! },
  });
  if (!order) { res.status(404).json({ error: 'Заказ не найден' }); return; }

  const updated = await prisma.order.update({
    where:   { id: orderId },
    data:    { status: parsed.data.status },
    include: { items: { take: 1 } },
  });
  res.json({ order: serializeOrder(updated) });
});

// PUT /api/orders/:id — save item params for an order
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params['id'] as string;
  const order = await prisma.order.findFirst({
    where:   { id: orderId, userId: req.userId! },
    include: { items: { take: 1 } },
  });
  if (!order) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }

  const parsed = ItemSchema.safeParse(req.body.item);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' });
    return;
  }
  const data = parsed.data;

  const updated = order.items[0]
    ? await prisma.order.update({
        where: { id: order.id },
        data:  { items: { update: { where: { id: order.items[0].id }, data } } },
        include: { items: { take: 1 } },
      })
    : await prisma.order.update({
        where: { id: order.id },
        data:  { items: { create: data } },
        include: { items: { take: 1 } },
      });

  res.json({ order: serializeOrder(updated) });
});

// DELETE /api/orders/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params['id'] as string;
  const [order, count] = await Promise.all([
    prisma.order.findFirst({ where: { id: orderId, userId: req.userId! } }),
    prisma.order.count({ where: { userId: req.userId! } }),
  ]);
  if (!order) {
    res.status(404).json({ error: 'Заказ не найден' });
    return;
  }
  if (count <= 1) {
    res.status(400).json({ error: 'Нельзя удалить последний заказ' });
    return;
  }
  await prisma.order.delete({ where: { id: order.id } });
  res.json({ ok: true });
});

export default router;
