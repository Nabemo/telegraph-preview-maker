// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем приложение на весь экран
tg.MainButton.setText('ОПУБЛИКОВАТЬ').hide();
tg.enableClosingConfirmation(); // Спросит перед закрытием, если статья не опубликована

// Элементы DOM
const editorScreen = document.getElementById('editor-screen');
const successScreen = document.getElementById('success-screen');
const loadingIndicator = document.getElementById('loading');
const authorInput = document.getElementById('author');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const previewArea = document.getElementById('preview');
const resultUrlLink = document.getElementById('result-url');

let finalArticleUrl = '';

// Обновляем предпросмотр при вводе
contentInput.addEventListener('input', updatePreview);
titleInput.addEventListener('input', updatePreview);

// Обновляем кнопку "Опубликовать"
contentInput.addEventListener('input', togglePublishButton);
titleInput.addEventListener('input', togglePublishButton);

function togglePublishButton() {
    if (titleInput.value.trim() && contentInput.value.trim()) {
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// Обработчик нажатия на кнопку "Опубликовать"
tg.MainButton.onClick(publishArticle);

// Функции форматирования текста
function formatText(type) {
    const textarea = contentInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let wrappedText = '';

    switch(type) {
        case 'bold':
            wrappedText = `**${selectedText}**`;
            break;
        case 'italic':
            wrappedText = `_${selectedText}_`;
            break;
        case 'code':
            wrappedText = `\`${selectedText}\``;
            break;
    }

    textarea.value = textarea.value.substring(0, start) + wrappedText + textarea.value.substring(end);
    updatePreview();
    textarea.focus();
}

function addLink() {
    const url = prompt('Введите URL:');
    if (url) {
        const text = prompt('Введите текст ссылки:', url);
        if (text) {
            const markdownLink = `[${text}](${url})`;
            const textarea = contentInput;
            const start = textarea.selectionStart;
            textarea.value = textarea.value.substring(0, start) + markdownLink + textarea.value.substring(start);
            updatePreview();
        }
    }
}

// Простой парсинг Markdown для предпросмотра
function updatePreview() {
    let html = contentInput.value
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n/g, '<br>');

    previewArea.innerHTML = html || '<em class="placeholder">Превью появится здесь...</em>';
}

// Главная функция - публикация статьи
async function publishArticle() {
    // Показываем индикатор загрузки
    loadingIndicator.classList.remove('hidden');
    tg.MainButton.showProgress();

    // Готовим содержимое для Telegraph API
    // Преобразуем наш текст в формат, понятный для Telegraph (массив Node-объектов)
    const contentNodes = convertTextToNodes(contentInput.value);

    // Формируем данные для отправки
    const postData = {
        title: titleInput.value,
        author: authorInput.value || undefined,
        content: contentNodes
    };

    try {
        // Отправляем запрос на НАШ прокси на Vercel
        const response = await fetch('/api/createPage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();

        if (result.success) {
            // Успех!
            finalArticleUrl = result.url;
            showSuccessScreen(result.url);
        } else {
            // Ошибка от API
            tg.showPopup({ title: 'Ошибка', message: result.error || 'Неизвестная ошибка' });
        }

    } catch (error) {
        // Сетевая ошибка или ошибка парсинга JSON
        console.error('Publish error:', error);
        tg.showPopup({ title: 'Ошибка', message: 'Не удалось опубликовать статью. Проверьте соединение.' });
    } finally {
        // Убираем индикатор загрузки в любом случае
        loadingIndicator.classList.add('hidden');
        tg.MainButton.hideProgress();
    }
}

// Вспомогательная функция: преобразует простой текст с Markdown в Nodes для Telegraph
function convertTextToNodes(text) {
    const lines = text.split('\n');
    const nodes = [];

    for (const line of lines) {
        if (!line.trim()) continue; // Пропускаем пустые строки

        let nodeContent = line;

        // Обрабатываем жирный текст
        nodeContent = nodeContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Обрабатываем курсив
        nodeContent = nodeContent.replace(/_(.*?)_/g, '<em>$1</em>');
        // Обрабатываем код
        nodeContent = nodeContent.replace(/`(.*?)`/g, '<code>$1</code>');
        // Обрабатываем ссылки [текст](url)
        nodeContent = nodeContent.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

        nodes.push({
            tag: 'p',
            children: [nodeContent] // Telegraph поймет простой HTML внутри
        });
    }

    return nodes;
}

function showSuccessScreen(url) {
    editorScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
    resultUrlLink.href = url;
    resultUrlLink.textContent = url;
    tg.MainButton.hide();
}

function shareLink() {
    if (finalArticleUrl && tg.isVersionAtLeast('6.2')) {
        tg.sharePopup({ message: finalArticleUrl });
    } else {
        // Fallback: копируем в буфер обмена
        navigator.clipboard.writeText(finalArticleUrl).then(() => {
            tg.showPopup({ title: 'Успех', message: 'Ссылка скопирована в буфер!' });
        });
    }
}

// Инициализация приложения
updatePreview();