import { Router, Request, Response } from 'express';
import { sendPdfViaMax } from '../lib/maxBot';

const router = Router();

// POST /api/bot/send-pdf?orderNum=42
// Content-Type: application/pdf
// Body: raw PDF bytes
router.post('/send-pdf', async (req: Request, res: Response) => {
  const orderNum = req.query['orderNum'] ?? 'N';
  const buf = req.body as Buffer;

  if (!buf || buf.length === 0) {
    res.status(400).json({ error: 'Пустое тело запроса' });
    return;
  }

  const filename = `order_${orderNum}.pdf`;
  const caption = `📄 Заказ №${orderNum}`;

  await sendPdfViaMax(buf, filename, caption);
  res.json({ ok: true });
});

export default router;
