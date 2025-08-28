// 🎓 Навчальний коментар: Приклад 1 - Базовий HTTP чат-клієнт
// Цей JavaScript файл обробляє клієнтську логіку для нашого базового HTTP чату.
// Зверніть увагу, який він простий - ми лише отримуємо повідомлення при завантаженні сторінки та відправляємо нові.

// 🔧 Технічний коментар: Отримуємо ім'я користувача з URL параметра запиту
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user') || 'Анонім';

// 🔧 Технічний коментар: Відображаємо поточного користувача
document.getElementById('currentUser').textContent = username;

// 🎓 Навчальний коментар: Функція для форматування міток часу для відображення
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 🎓 Навчальний коментар: Функція для відображення повідомлень в UI
function displayMessages(messages) {
    // 🔧 Технічний коментар: Отримуємо контейнер повідомлень
    const messagesDiv = document.getElementById('messages');
    
    // 🔧 Технічний коментар: Очищаємо існуючі повідомлення
    messagesDiv.innerHTML = '';
    
    // 🔧 Технічний коментар: Відображаємо кожне повідомлення
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // 🔧 Технічний коментар: Створюємо HTML повідомлення з ім'ям користувача та міткою часу
        messageElement.innerHTML = `
            <span class="username">${message.user}:</span>
            <span class="text">${message.text}</span>
            <span class="timestamp">${formatTime(message.timestamp)}</span>
        `;
        
        messagesDiv.appendChild(messageElement);
    });
    
    // 🔧 Технічний коментар: Прокручуємо вниз, щоб показати останні повідомлення
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 🎓 Навчальний коментар: Функція для завантаження всіх повідомлень з сервера
async function loadMessages() {
    try {
        // 🔧 Технічний коментар: Робимо GET запит для отримання повідомлень
        console.log('🔄 Отримуємо повідомлення з сервера...');
        const response = await fetch('/messages'); // 127.0.0.1:3000/messages
        
        // 🔧 Технічний коментар: Перевіряємо, чи запит був успішним
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 🔧 Технічний коментар: Парсимо JSON відповідь
        const messages = await response.json();
        console.log(`✅ Завантажено ${messages.length} повідомлень`);
        
        // 🔧 Технічний коментар: Відображаємо повідомлення
        displayMessages(messages);
        
    } catch (error) {
        // ⚠️ Попередження: В продакшені ви б обробляли помилки більш елегантно
        console.error('❌ Помилка завантаження повідомлень:', error);
        alert('Не вдалося завантажити повідомлення. Будь ласка, оновіть сторінку.');
    }
}

// 🎓 Навчальний коментар: Функція для відправки нового повідомлення
async function sendMessage() {
    // 🔧 Технічний коментар: Отримуємо елемент вводу та текст повідомлення
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    // 🔧 Технічний коментар: Не відправляємо порожні повідомлення
    if (!text) {
        return;
    }
    
    try {
        // 🔧 Технічний коментар: Вимикаємо ввід під час відправки
        input.disabled = true;
        document.getElementById('sendButton').disabled = true;
        
        // 🎓 Навчальний коментар: Робимо POST запит для відправки повідомлення
        console.log('📤 Відправляємо повідомлення...');
        const response = await fetch('/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: username,
                text: text
            })
        });
        
        // 🔧 Технічний коментар: Перевіряємо, чи запит був успішним
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Повідомлення успішно відправлено');
        
        // 🔧 Технічний коментар: Очищаємо поле вводу
        input.value = '';
        
        // 🎓 Навчальний коментар: Перезавантажуємо повідомлення, щоб показати наше нове повідомлення
        // Увага: Це показує ЛИШЕ НАШЕ нове повідомлення, а не повідомлення від інших!
        await loadMessages();
        
    } catch (error) {
        // ⚠️ Попередження: В продакшені ви б обробляли помилки більш елегантно
        console.error('❌ Помилка відправки повідомлення:', error);
        alert('Не вдалося відправити повідомлення. Будь ласка, спробуйте ще раз.');
        
    } finally {
        // 🔧 Технічний коментар: Знову вмикаємо ввід
        input.disabled = false;
        document.getElementById('sendButton').disabled = false;
        input.focus();
    }
}

// 🎓 Навчальний коментар: Налаштовуємо обробники подій при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Чат-застосунок ініціалізовано');
    console.log(`👤 Користувач: ${username}`);
    
    // 🔧 Технічний коментар: Завантажуємо повідомлення при завантаженні сторінки
    loadMessages();
    
    // 🔧 Технічний коментар: Відправляємо повідомлення при натисканні кнопки
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    
    // 🔧 Технічний коментар: Відправляємо повідомлення при натисканні клавіші Enter
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 🔧 Технічний коментар: Фокусуємося на полі вводу
    document.getElementById('messageInput').focus();
});

// 🎓 Навчальний коментар: Ключові обмеження цього підходу:
// 1. Немає автоматичних оновлень - ми бачимо нові повідомлення лише після ручного оновлення
// 2. Поганий користувацький досвід - користувачі не знають, коли приходять нові повідомлення
// 3. Можливість пропустити повідомлення між оновленнями
// 4. Немає взаємодії в реальному часі - більше схоже на електронну пошту, ніж на чат

// ⚡ Цікавий факт: До AJAX (2005), УСІ веб-сторінки працювали саме так!
// Кожна взаємодія вимагала повного оновлення сторінки.
