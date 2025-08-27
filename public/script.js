class TelegraphManager {
    constructor() {
        this.supabaseUrl = '';
        this.apiKey = '';
        this.headers = {};
    }

    initialize(url, key) {
        this.supabaseUrl = url;
        this.apiKey = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/articles?select=count`, {
                method: 'GET',
                headers: this.headers
            });

            if (response.ok) {
                this.log('✅ Подключение к Supabase успешно установлено');
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка: ${response.status} - ${errorData.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            this.log(`❌ Ошибка подключения: ${error.message}`);
            return false;
        }
    }

    async createArticle(articleData) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/articles`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(articleData)
            });

            if (response.ok) {
                const result = await response.json();
                this.log('✅ Статья успешно создана!');
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка создания: ${response.status} - ${errorData.message}`);
            }
        } catch (error) {
            this.log(`❌ Ошибка при создании статьи: ${error.message}`);
            throw error;
        }
    }

    async getArticles() {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/articles?select=*&order=created_at.desc`, {
                method: 'GET',
                headers: this.headers
            });

            if (response.ok) {
                const articles = await response.json();
                this.log(`📚 Загружено статей: ${articles.length}`);
                return articles;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка загрузки: ${response.status} - ${errorData.message}`);
            }
        } catch (error) {
            this.log(`❌ Ошибка при загрузке статей: ${error.message}`);
            throw error;
        }
    }

    async updateArticle(id, updates) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/articles?id=eq.${id}`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                this.log(`✏️ Статья ${id} обновлена`);
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка обновления: ${response.status} - ${errorData.message}`);
            }
        } catch (error) {
            this.log(`❌ Ошибка при обновлении статьи: ${error.message}`);
            throw error;
        }
    }

    async deleteArticle(id) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/articles?id=eq.${id}`, {
                method: 'DELETE',
                headers: this.headers
            });

            if (response.ok) {
                this.log(`🗑️ Статья ${id} удалена`);
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка удаления: ${response.status} - ${errorData.message}`);
            }
        } catch (error) {
            this.log(`❌ Ошибка при удалении статьи: ${error.message}`);
            throw error;
        }
    }

    log(message) {
        const logsContainer = document.getElementById('logs');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

class StorageManager {
    constructor() {
        this.supabaseUrl = '';
        this.apiKey = '';
    }

    initialize(url, key) {
        this.supabaseUrl = url;
        this.apiKey = key;
    }

    async uploadFile(file, bucketName = 'telegraph') {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(
                `${this.supabaseUrl}/storage/v1/object/${bucketName}/${file.name}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: formData
                }
            );

            if (response.ok) {
                const data = await response.json();
                telegrapher.log(`✅ Файл "${file.name}" загружен успешно`);
                return data;
            } else {
                const errorData = await response.json();
                throw new Error(`Ошибка загрузки: ${response.status} - ${errorData.message}`);
            }
        } catch (error) {
            telegrapher.log(`❌ Ошибка загрузки файла: ${error.message}`);
            throw error;
        }
    }

    getFileUrl(filePath, bucketName = 'telegraph') {
        return `${this.supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
    }
}

const telegrapher = new TelegraphManager();
const storageManager = new StorageManager();
let currentImageUrl = '';

function updateConnectionStatus(status, message) {
    const statusElement = document.getElementById('connection-status');
    const statusText = statusElement.querySelector('.status-text');
    const statusIndicator = statusElement.querySelector('.status-indicator');
    
    statusElement.className = 'connection-status ' + status;
    statusText.textContent = message;
    
    statusIndicator.className = 'status-indicator status-' + status;
}

async function testConnection() {
    const url = document.getElementById('supabase-url').value;
    const key = document.getElementById('api-key').value;

    if (!url || !key) {
        updateConnectionStatus('disconnected', 'Заполните URL и API ключ');
        alert('Пожалуйста, заполните все поля настроек');
        return;
    }

    updateConnectionStatus('pending', 'Проверяем подключение...');

    telegrapher.initialize(url, key);
    storageManager.initialize(url, key);
    
    try {
        const isConnected = await telegrapher.testConnection();
        
        if (isConnected) {
            updateConnectionStatus('connected', '✅ Supabase подключен! Можно работать');
            localStorage.setItem('supabase_url', url);
            localStorage.setItem('supabase_key', key);
        } else {
            updateConnectionStatus('disconnected', '❌ Ошибка подключения');
        }
    } catch (error) {
        updateConnectionStatus('disconnected', '❌ Ошибка: ' + error.message);
    }
}

async function uploadImage() {
    const fileInput = document.getElementById('article-image');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Выберите файл для загрузки');
        return;
    }

    try {
        const result = await storageManager.uploadFile(file);
        currentImageUrl = await storageManager.getFileUrl(file.name);
        
        const preview = document.getElementById('image-preview');
        preview.innerHTML = `
            <img src="${currentImageUrl}" style="max-width: 200px; margin-top: 10px; border-radius: 5px;">
            <p>Файл загружен: ${file.name}</p>
        `;
        
    } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
    }
}

async function createArticle() {
    const title = document.getElementById('article-title').value;
    const author = document.getElementById('article-author').value;
    const content = document.getElementById('article-content').value;

    if (!title || !content) {
        alert('Пожалуйста, заполните заголовок и содержание статьи');
        return;
    }

    const articleData = {
        title: title,
        author: author,
        content: content,
        created_at: new Date().toISOString(),
        views: 0,
        likes: 0
    };

    if (currentImageUrl) {
        articleData.image_url = currentImageUrl;
    }

    try {
        await telegrapher.createArticle(articleData);
        
        document.getElementById('article-title').value = '';
        document.getElementById('article-author').value = '';
        document.getElementById('article-content').value = '';
        document.getElementById('article-image').value = '';
        document.getElementById('image-preview').innerHTML = '';
        currentImageUrl = '';
        
        await loadArticles();
        
    } catch (error) {
        console.error('Ошибка создания статьи:', error);
    }
}

async function loadArticles() {
    try {
        const articles = await telegrapher.getArticles();
        displayArticles(articles);
    } catch (error) {
        console.error('Ошибка загрузки статей:', error);
    }
}

function displayArticles(articles) {
    const container = document.getElementById('articles-list');
    container.innerHTML = '';

    if (articles.length === 0) {
        container.innerHTML = '<p>Статьи не найдены</p>';
        return;
    }

    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        
        let imageHtml = '';
        if (article.image_url) {
            imageHtml = `<img src="${article.image_url}" class="article-image" alt="${article.title}">`;
        }
        
        articleCard.innerHTML = `
            ${imageHtml}
            <h3>${article.title}</h3>
            <div class="article-meta">
                <strong>Автор:</strong> ${article.author || 'Неизвестен'} |
                <strong>Дата:</strong> ${new Date(article.created_at).toLocaleDateString()}
            </div>
            <p>${article.content.substring(0, 100)}${article.content.length > 100 ? '...' : ''}</p>
            <div class="article-meta">
                <span>👁️ ${article.views} | 👍 ${article.likes}</span>
            </div>
            <button onclick="editArticle(${article.id})">✏️ Редактировать</button>
            <button onclick="deleteArticle(${article.id})" class="btn-danger">🗑️ Удалить</button>
        `;
        
        container.appendChild(articleCard);
    });
}

async function editArticle(id) {
    const newTitle = prompt('Введите новый заголовок:');
    if (newTitle) {
        try {
            await telegrapher.updateArticle(id, { title: newTitle });
            await loadArticles();
        } catch (error) {
            console.error('Ошибка редактирования:', error);
        }
    }
}

async function deleteArticle(id) {
    if (confirm('Вы уверены, что хотите удалить эту статью?')) {
        try {
            await telegrapher.deleteArticle(id);
            await loadArticles();
        } catch (error) {
            console.error('Ошибка удаления:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_key');
    
    if (savedUrl) document.getElementById('supabase-url').value = savedUrl;
    if (savedKey) document.getElementById('api-key').value = savedKey;
    
    if (savedUrl && savedKey) {
        setTimeout(testConnection, 1000);
    }
    
    telegrapher.log('🚀 Приложение Telegraph Manager запущено');
    telegrapher.log('🔧 Настройте подключение к Supabase и начните работу');
});