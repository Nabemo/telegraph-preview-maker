// Эта функция будет доступна по адресу https://your-domain.vercel.app/api/createPage

export default async function handler(req, res) {
  // Разрешаем запросы с любого origin (чтобы работало из TMA)
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Разрешаем отправлять POST-запросы
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  // Разрешаем нужные заголовки
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем предварительный запрос (preflight) для CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Работаем только с POST-запросами
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем данные из тела запроса от фронтенда
    const { title, author, content } = req.body;

    // Формируем данные для отправки в Telegraph API
    const requestBody = new URLSearchParams();
    requestBody.append('title', title || 'Untitled');
    if (author) requestBody.append('author_name', author);
    // API Telegraph ждет содержимое в виде строки JSON
    requestBody.append('content', JSON.stringify(content || []));

    // Делаем запрос к официальному API Telegraph
    const telegraphResponse = await fetch('https://api.telegra.ph/createPage', {
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Парсим ответ от Telegraph
    const data = await telegraphResponse.json();

    // Если Telegraph ответил ошибкой, передаем ее дальше
    if (!data.ok) {
      return res.status(500).json({ error: data.error || 'Failed to create page' });
    }

    // Если все ок, возвращаем результат фронтенду
    res.status(200).json({
      success: true,
      url: `https://telegra.ph/${data.result.path}`, // Полная ссылка на статью
      path: data.result.path
    });

  } catch (error) {
    // Ловим любые другие ошибки (например, проблемы с сетью)
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}