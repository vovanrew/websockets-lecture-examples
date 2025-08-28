// 🎓 Навчальний коментар: Приклад 2 - HTTP Коротке Опитування чат-клієнт
// Ця версія автоматично опитує сервер кожні 20 секунд про нові повідомлення.
// Хоча це забезпечує автоматичні оновлення, це все ще неефективно.

// 🔧 Технічний коментар: Конфігурація та стан
const POLLING_INTERVAL = 1000; // 20 секунд в мілісекундах
const username = new URLSearchParams(window.location.search).get('user') || 'Анонім';
let pollCount = 0;
let lastMessageCount = 0;
let pollingTimer = null;

// 🔧 Технічний коментар: Відображаємо ім'я користувача
document.getElementById('currentUser').textContent = username;

// 🎓 Навчальний коментар: Функція для оновлення індикатора статусу опитування
function updateStatus(text, isPolling = false) {
    const statusElement = document.getElementById('status-text');
    statusElement.textContent = text;
    
    if (isPolling) {
        statusElement.classList.add('polling');
    } else {
        statusElement.classList.remove('polling');
    }
}

// 🎓 Навчальний коментар: Функція для оновлення відображення статистики
function updateStats(messageCount) {
    document.getElementById('pollCount').textContent = pollCount;
    document.getElementById('messageCount').textContent = messageCount;
    
    // 🔧 Технічний коментар: Вираховуємо ефективність (опитувань на нове повідомлення)
    if (messageCount > lastMessageCount) {
        const newMessages = messageCount - lastMessageCount;
        const efficiency = (pollCount / messageCount).toFixed(1);
        document.getElementById('efficiency').textContent = `${efficiency} опитувань/повід.`;
        lastMessageCount = messageCount;
    }
}

// 🔧 Технічний коментар: Допоміжна функція форматування мітки часу
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('uk-UA', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 🎓 Навчальний коментар: Функція для відображення повідомлень (така ж, як у Прикладі 1)
function displayMessages(messages) {
    const messagesDiv = document.getElementById('messages');
    const previousCount = messagesDiv.children.length;
    
    messagesDiv.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <span class="username">${message.user}:</span>
            <span class="text">${message.text}</span>
            <span class="timestamp">${formatTime(message.timestamp)}</span>
        `;
        messagesDiv.appendChild(messageElement);
    });
    
    // 🔧 Технічний коментар: Прокручуємо лише якщо були додані нові повідомлення
    if (messages.length > previousCount) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        console.log(`🆕 Отримано ${messages.length - previousCount} нових повідомлень`);
    }
    
    updateStats(messages.length);
}

// 🎓 Навчальний коментар: Покращена функція loadMessages зі статусом опитування
async function loadMessages() {
    try {
        // 🔧 Технічний коментар: Оновлюємо UI, щоб показати, що відбувається опитування
        updateStatus('Перевіряємо нові повідомлення...', true);
        pollCount++;
        
        console.log(`🔄 Опитування #${pollCount} - Перевіряємо нові повідомлення...`);
        const response = await fetch('/messages');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const messages = await response.json();
        displayMessages(messages);
        
        // 🔧 Технічний коментар: Оновлюємо статус після успішного опитування
        updateStatus('Підключено', false);
        
    } catch (error) {
        console.error('❌ Помилка опитування:', error);
        updateStatus('Помилка з\'єднання', false);
        // ⚠️ Попередження: У продакшені реалізуйте експоненційне відставлення для помилок
    }
}

// 🎓 Навчальний коментар: Запускаємо цикл опитування
function startPolling() {
    console.log('🚀 Запускаємо цикл опитування (кожні 20 секунд)');
    
    // 🔧 Технічний коментар: Завантажуємо повідомлення одразу
    loadMessages();
    
    // 🔧 Технічний коментар: Потім опитуємо кожні 20 секунд
    pollingTimer = setInterval(loadMessages, POLLING_INTERVAL);
    
    // ⚡ Цікавий факт: setInterval не ідеальний - затримки можуть накопичуватися
    // Для продакшену розгляньте рекурсивне використання setTimeout
}

// 🎓 Навчальний коментар: Зупиняємо опитування (корисно для очищення)
function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        console.log('⏹️ Опитування зупинено');
        updateStatus('Опитування зупинено', false);
    }
}

// 🎓 Навчальний коментар: Функція відправки повідомлення (аналогічно Прикладу 1)
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        input.disabled = true;
        document.getElementById('sendButton').disabled = true;
        
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Повідомлення відправлено');
        input.value = '';
        
        // 🎓 Навчальний коментар: Завантажуємо повідомлення одразу після відправки
        // Не чекаємо наступного циклу опитування
        await loadMessages();
        
    } catch (error) {
        console.error('❌ Помилка відправки повідомлення:', error);
        alert('Не вдалося відправити повідомлення. Будь ласка, спробуйте ще раз.');
    } finally {
        input.disabled = false;
        document.getElementById('sendButton').disabled = false;
        input.focus();
    }
}

// 🎓 Навчальний коментар: Ініціалізуємо застосунок
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 HTTP коротке опитування чат ініціалізовано');
    console.log(`👤 Користувач: ${username}`);
    console.log(`⏱️ Інтервал опитування: ${POLLING_INTERVAL}мс`);
    
    // 🔧 Технічний коментар: Запускаємо опитування
    startPolling();
    
    // 🔧 Технічний коментар: Налаштовуємо обробники подій
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    document.getElementById('messageInput').focus();
    
    // 🎓 Навчальний коментар: Очищаємо опитування при закритті сторінки
    window.addEventListener('beforeunload', () => {
        stopPolling();
    });
});

// 🎓 Навчальний коментар: Проблеми короткого опитування:
// 1. Неефективність: Більшість опитувань не повертають нові дані (марні запити)
// 2. Затримка: До 20 секунд перед появою нових повідомлень
// 3. Навантаження на сервер: З 1000 користувачами = 3,000 запитів/хвилину!
// 4. Пропускна здатність: Передає УСІ повідомлення щоразу
// 5. Розрядка батареї: Постійна мережева активність на мобільних пристроях

// 🎓 Навчальний коментар: Коли коротке опитування доречне?
// - Низькочастотні оновлення (ціни акцій кожну хвилину)
// - Мала кількість клієнтів
// - Прості вимоги до реалізації
// - Коли WebSockets недоступні
