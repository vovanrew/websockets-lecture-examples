// 🎓 Навчальний коментар: Приклад 3 - HTTP Довге Опитування чат-клієнт
// Це революційний підхід! Замість постійного питання сервера про оновлення,
// ми робимо один запит і сервер тримає його відкритим, доки не з'явиться нові дані.
// Це дає нам майже миттєві оновлення з набагато кращою ефективністю.

// 🔧 Технічний коментар: Конфігурація та стан
const username = new URLSearchParams(window.location.search).get('user') || 'Анонім';
let lastMessageId = 0;
let connectionStartTime = Date.now();
let messageCount = 0;
let reconnectCount = 0;
let isSubscribed = false;

// 🔧 Технічний коментар: Відображаємо ім'я користувача
document.getElementById('currentUser').textContent = username;

// 🎓 Навчальний коментар: Логування налагодження для навчальних цілей
function debugLog(message, isImportant = false) {
    const debugPanel = document.getElementById('debugPanel');
    const entry = document.createElement('div');
    entry.className = 'debug-entry' + (isImportant ? ' important' : '');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    debugPanel.appendChild(entry);
    
    // Залишаємо лише останні 10 записів
    while (debugPanel.children.length > 10) {
        debugPanel.removeChild(debugPanel.children[1]); // Залишаємо заголовок
    }
    
    debugPanel.scrollTop = debugPanel.scrollHeight;
    console.log(message);
}

// 🎓 Навчальний коментар: Оновлюємо індикатор статусу з'єднання
function updateConnectionStatus(status, text) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('status-text');
    
    statusDot.className = 'status-dot ' + status;
    statusText.textContent = text;
}

// 🎓 Навчальний коментар: Оновлюємо статистику
function updateStats() {
    // Час з'єднання
    const elapsed = Math.floor((Date.now() - connectionStartTime) / 1000);
    document.getElementById('connectionTime').textContent = `${elapsed}с`;
    
    // Кількість повідомлень
    document.getElementById('messageCount').textContent = messageCount;
    
    // Кількість перепідключень
    document.getElementById('reconnectCount').textContent = reconnectCount;
}

// 🔧 Технічний коментар: Оновлюємо статистику кожну секунду
setInterval(updateStats, 1000);

// 🔧 Технічний коментар: Форматування мітки часу
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 🎓 Навчальний коментар: Відображаємо повідомлення з анімацією для нових
function displayMessages(messages, isInitialLoad = false) {
    const messagesDiv = document.getElementById('messages');
    
    if (isInitialLoad) {
        messagesDiv.innerHTML = '';
    }
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message' + (isInitialLoad ? '' : ' new');
        messageElement.innerHTML = `
            <span class="username">${message.user}:</span>
            <span class="text">${message.text}</span>
            <span class="timestamp">${formatTime(message.timestamp)}</span>
        `;
        messagesDiv.appendChild(messageElement);
        
        // Оновлюємо ID останнього повідомлення
        if (message.id > lastMessageId) {
            lastMessageId = message.id;
        }
    });
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    if (!isInitialLoad && messages.length > 0) {
        messageCount += messages.length;
        debugLog(`📨 Received ${messages.length} new message(s)`, true);
    }
}

// 🎓 Навчальний коментар: Початкове завантаження існуючих повідомлень
async function loadInitialMessages() {
    try {
        debugLog('📥 Loading initial messages...');
        const response = await fetch('/messages');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const messages = await response.json();
        displayMessages(messages, true);
        
        if (messages.length > 0) {
            lastMessageId = Math.max(...messages.map(m => m.id));
        }
        
        debugLog(`✅ Loaded ${messages.length} existing messages`);
        
    } catch (error) {
        debugLog(`❌ Error loading messages: ${error.message}`);
        updateConnectionStatus('error', 'Failed to load messages');
    }
}

// 🎓 Навчальний коментар: Це серце довгого опитування!
// Ми підписуємося на оновлення і сервер тримає наше з\'єднання
async function subscribeToUpdates() {
    // Запобігаємо множинним підпискам
    if (isSubscribed) return;
    isSubscribed = true;
    
    while (isSubscribed) {
        try {
            updateConnectionStatus('waiting', 'Waiting for messages...');
            debugLog(`🔌 Opening long-poll connection (lastId: ${lastMessageId})`);
            
            // 🎓 Teaching Comment: This request will hang until:
            // 1. New messages arrive (server sends them)
            // 2. Timeout occurs (server sends 204 No Content)
            // 3. Connection error
            const response = await fetch(`/subscribe?lastId=${lastMessageId}`);
            
            if (response.status === 204) {
                // 🔧 Технічний коментар: Таймаут - немає нових повідомлень
                debugLog('⏱️ Таймаут довгого опитування (30с) - перепідключення...');
                updateConnectionStatus('connected', 'Підключено');
                continue; // Негайно перепідключаємося
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 🎓 Навчальний коментар: Отримано нові повідомлення!
            const newMessages = await response.json();
            if (newMessages.length > 0) {
                updateConnectionStatus('connected', 'Повідомлення отримано!');
                displayMessages(newMessages);
                
                // Мигаємо статусом з\'єднання
                setTimeout(() => {
                    updateConnectionStatus('connected', 'Підключено');
                }, 1000);
            }
            
        } catch (error) {
            debugLog(`❌ Connection error: ${error.message}`);
            updateConnectionStatus('error', 'Connection lost');
            
            // 🎓 Teaching Comment: Reconnection logic
            // In production, implement exponential backoff
            reconnectCount++;
            debugLog('🔄 Reconnecting in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            updateConnectionStatus('waiting', 'Reconnecting...');
        }
    }
}

// 🎓 Teaching Comment: Send a new message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        input.disabled = true;
        document.getElementById('sendButton').disabled = true;
        
        debugLog('📤 Sending message...');
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
        
        debugLog('✅ Message sent successfully', true);
        input.value = '';
        
        // 🎓 Teaching Comment: With long polling, we'll receive our own
        // message through the subscription, just like everyone else!
        
    } catch (error) {
        debugLog(`❌ Error sending message: ${error.message}`);
        alert('Failed to send message. Please try again.');
    } finally {
        input.disabled = false;
        document.getElementById('sendButton').disabled = false;
        input.focus();
    }
}

// 🎓 Teaching Comment: Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 Довге опитування чат ініціалізовано', true);
    debugLog(`👤 Користувач: ${username}`);
    
    // Load initial messages
    await loadInitialMessages();
    
    // Start long polling subscription
    subscribeToUpdates();
    
    // Set up event listeners
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    document.getElementById('messageInput').focus();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        isSubscribed = false;
        debugLog('👋 Закриваємо з\'єднання довгого опитування');
    });
});

// 🎓 Навчальний коментар: Переваги довгого опитування:
// 1. Майже миттєві оновлення (повідомлення приходять миттєво)
// 2. Ефективність (немає марних запитів при відсутності нових даних)
// 3. Працює через файрволи (стандартний HTTP)
// 4. Підтримується всіма браузерами
//
// Залишкові обмеження:
// 1. Все ще односпрямований (клієнт повинен ініціювати)
// 2. Витрати на з'єднання (TCP рукостискання для кожного запиту)
// 3. Складність обробки перепідключень
// 4. Сервер повинен управляти висячими з'єднаннями

// ⚡ Цікавий факт: Gmail використовував довге опитування роками для
// миттєвої доставки нових листів без оновлення сторінки!
