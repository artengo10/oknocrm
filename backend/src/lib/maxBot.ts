const MAX_API = 'https://platform-api.max.ru';

function token() {
  const t = process.env.MAX_BOT_TOKEN;
  if (!t) throw new Error('MAX_BOT_TOKEN not set');
  return t;
}

async function uploadFile(buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append('data', new Blob([ab], { type: 'application/pdf' }), filename);

  const res = await fetch(`${MAX_API}/uploads?type=file`, {
    method: 'POST',
    headers: { Authorization: token() },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAX upload failed ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { token?: string; url?: string };
  if (!json.token) throw new Error(`MAX upload: no token in response: ${JSON.stringify(json)}`);
  return json.token;
}

async function sendFileMessage(fileToken: string, chatId: string, caption: string): Promise<void> {
  const body = {
    text: caption,
    attachments: [{ type: 'file', payload: { token: fileToken } }],
  };

  const res = await fetch(`${MAX_API}/messages?user_id=${encodeURIComponent(chatId)}`, {
    method: 'POST',
    headers: { Authorization: token(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAX send failed ${res.status}: ${text}`);
  }
}

export async function sendPdfViaMax(
  pdfBuffer: Buffer,
  filename: string,
  caption: string,
): Promise<void> {
  const chatId = process.env.MAX_CHAT_ID;
  if (!chatId) throw new Error('MAX_CHAT_ID not set');

  const fileToken = await uploadFile(pdfBuffer, filename);
  await sendFileMessage(fileToken, chatId, caption);
}
