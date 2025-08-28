// 🎓 Навчальний коментар: Приклад 4 - WebSocket чат-клієнт
// Це висша еволюція! WebSockets забезпечують постійне, повнодуплексне
// з'єднання. Повідомлення надходять миттєво в обох напрямках з мінімальними витратами.
// Ніякого опитування, ніякого очікування - це справжня комунікація в реальному часі!

// 🔧 Технічний коментар: Конфігурація та стан
const username = new URLSearchParams(window.location.search).get('user') || 'Анонім';
let ws = null;
let reconnectAttempts = 0;
let latencyInterval = null;
let lastPingTime = 0;
const connectedUsers = new Set();

// 🔧 Технічний коментар: Відображаємо ім'я користувача
document.getElementById('currentUser').textContent = `Користувач: ${username}`;

// 🎓 Навчальний коментар: Логування налагодження з візуальною консоллю
function debugLog(message, type = 'info') {
    const debugConsole = document.getElementById('debugConsole');
    const entry = document.createElement('div');
    entry.className = 'debug-entry';
    
    const time = document.createElement('span');
    time.className = 'debug-time';
    time.textContent = new Date().toLocaleTimeString();
    
    const msg = document.createElement('span');
    msg.className = `debug-message ${type}`;
    msg.textContent = message;
    
    entry.appendChild(time);
    entry.appendChild(msg);
    debugConsole.appendChild(entry);
    
    // Залишаємо лише останні 10 записів
    while (debugConsole.children.length > 10) {
        debugConsole.removeChild(debugConsole.firstChild);
    }
    
    debugConsole.scrollTop = debugConsole.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// 🎓 Навчальний коментар: Оновлюємо UI статусу з'єднання
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('wsIndicator');
    const text = document.getElementById('connectionText');
    
    if (connected) {
        indicator.classList.add('connected');
        text.textContent = 'Підключено через WebSocket';
    } else {
        indicator.classList.remove('connected');
        text.textContent = 'Відключено';
    }
}

// 🎓 Навчальний коментар: Оновлюємо список користувачів
function updateUserList() {
    const userList = document.getElementById('userList');
    const userCount = document.getElementById('userCount');
    
    userList.innerHTML = '';
    connectedUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-status"></div>
            <span>${user}</span>
        `;
        userList.appendChild(userItem);
    });
    
    userCount.textContent = connectedUsers.size;
}

// 🔧 Технічний коментар: Форматування мітки часу
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 🎓 Навчальний коментар: Відображаємо повідомлення з різними стилями
function displayMessage(data, isOwn = false) {
    const messagesDiv = document.getElementById('messages');
    
    if (data.type === 'system') {
        // Системні повідомлення (користувач приєднався/покинув)
        const systemMsg = document.createElement('div');
        systemMsg.className = 'system-message';
        systemMsg.textContent = data.text;
        messagesDiv.appendChild(systemMsg);
    } else {
        // Звичайні повідомлення чату
        const messageElement = document.createElement('div');
        messageElement.className = 'message' + (isOwn ? ' own' : '');
        messageElement.innerHTML = `
            <span class="username">${data.user}:</span>
            <span class="text">${data.text}</span>
            <span class="timestamp">${formatTime(data.timestamp)}</span>
        `;
        messagesDiv.appendChild(messageElement);
    }
    
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 🎓 Навчальний коментар: Завантажуємо початкові повідомлення через HTTP
async function loadInitialMessages() {
    try {
        debugLog('Завантажуємо історія повідомлень...', 'info');
        const response = await fetch('/messages');
        const messages = await response.json();
        
        messages.forEach(msg => {
            displayMessage({
                user: msg.user,
                text: msg.text,
                timestamp: msg.timestamp
            }, msg.user === username);
        });
        
        debugLog(`Завантажено ${messages.length} повідомлень з історії`, 'success');
    } catch (error) {
        debugLog(`Не вдалося завантажити історію: ${error.message}`, 'error');
    }
}

// 🎓 Навчальний коментар: Підключаємося до WebSocket сервера
function connectWebSocket() {
    // 🔧 Технічний коментар: Конструюємо WebSocket URL з іменем користувача
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}?user=${encodeURIComponent(username)}`;
    
    debugLog(`Connecting to WebSocket: ${wsUrl}`, 'info');
    
    try {
        // 🎓 Навчальний коментар: Створюємо WebSocket з'єднання
        ws = new WebSocket(wsUrl);
        
        // 🎓 Навчальний коментар: З'єднання успішно відкрито
        ws.onopen = () => {
            debugLog('WebSocket з\'єднання встановлено!', 'success');
            updateConnectionStatus(true);
            reconnectAttempts = 0;
            
            // Запускаємо моніторинг затримки
            startLatencyMonitoring();
        };
        
        // 🎓 Навчальний коментар: Обробляємо вхідні повідомлення
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'welcome':
                        debugLog(data.message, 'success');
                        break;
                        
                    case 'user_list':
                        // 🎓 Навчальний коментар: Отримуємо список поточних користувачів
                        connectedUsers.clear();
                        data.users.forEach(user => connectedUsers.add(user));
                        updateUserList();
                        debugLog(`Завантажено ${data.users.length} користувачів онлайн`, 'success');
                        break;
                        
                    case 'message':
                        // 🎓 Навчальний коментар: Миттєва доставка повідомлення!
                        displayMessage({
                            user: data.message.user,
                            text: data.message.text,
                            timestamp: data.message.timestamp
                        }, data.message.user === username);
                        debugLog(`Повідомлення від ${data.message.user}`, 'info');
                        break;
                        
                    case 'user_joined':
                        connectedUsers.add(data.username);
                        updateUserList();
                        displayMessage({
                            type: 'system',
                            text: `${data.username} приєднався до чату`
                        });
                        debugLog(`${data.username} приєднався`, 'info');
                        break;
                        
                    case 'user_left':
                        connectedUsers.delete(data.username);
                        updateUserList();
                        displayMessage({
                            type: 'system',
                            text: `${data.username} покинув чат`
                        });
                        debugLog(`${data.username} покинув`, 'info');
                        break;
                        
                    case 'pong':
                        // 🎓 Навчальний коментар: Обчислюємо затримку
                        const latency = Date.now() - lastPingTime;
                        document.getElementById('latency').textContent = `Затримка: ${latency}мс`;
                        break;
                        
                    case 'heartbeat':
                        // 🎓 Навчальний коментар: Серверний heartbeat для підтримки з'єднання
                        debugLog('❤️ Heartbeat отримано', 'info');
                        break;
                        
                    default:
                        console.log('Unknown message type:', data.type);
                }
                
            } catch (error) {
                debugLog(`Error parsing message: ${error.message}`, 'error');
            }
        };
        
        // 🎓 Навчальний коментар: Обробляємо закриття з'єднання
        ws.onclose = (event) => {
            debugLog(`Connection closed: ${event.reason || 'Unknown reason'}`, 'error');
            updateConnectionStatus(false);
            stopLatencyMonitoring();
            
            // Очищаємо список користувачів
            connectedUsers.clear();
            updateUserList();
            
            // 🎓 Навчальний коментар: Автоматичне перепідключення з експоненційним відставленням
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            
            debugLog(`Перепідключення через ${delay/1000}с... (спроба ${reconnectAttempts})`, 'info');
            setTimeout(connectWebSocket, delay);
        };
        
        // 🎓 Навчальний коментар: Обробляємо помилки
        ws.onerror = (error) => {
            debugLog('WebSocket error occurred', 'error');
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        debugLog(`Failed to create WebSocket: ${error.message}`, 'error');
    }
}

// 🎓 Навчальний коментар: Надсилання повідомлення через WebSocket
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    // 🎓 Teaching Comment: Send message instantly via WebSocket
    const message = {
        type: 'message',
        text: text
    };
    
    ws.send(JSON.stringify(message));
    input.value = '';
    input.focus();
    
    debugLog('Повідомлення надіслано через WebSocket', 'success');
}

// 🎓 Навчальний коментар: Моніторинг затримки з'єднання
function startLatencyMonitoring() {
    latencyInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            lastPingTime = Date.now();
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    }, 5000); // Пінг кожні 5 секунд
}

function stopLatencyMonitoring() {
    if (latencyInterval) {
        clearInterval(latencyInterval);
        latencyInterval = null;
        document.getElementById('latency').textContent = 'Затримка: --мс';
    }
}

// 🎓 Навчальний коментар: Ініціалізуємо застосунок
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 WebSocket чат-застосунок запускається...', 'info');
    debugLog(`👤 Користувач: ${username}`, 'info');
    
    // Спочатку завантажуємо історію повідомлень
    await loadInitialMessages();
    
    // Підключаємося до WebSocket сервера
    connectWebSocket();
    
    // Налаштовуємо обробники подій
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    document.getElementById('messageInput').focus();
});

// 🎓 Навчальний коментар: Очищаємо при закритті сторінки
window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
});

// 🎓 Навчальний коментар: Поглиблений огляд WebSocket протоколу:
// 1. З'єднання починається з HTTP рукостискання (запит Upgrade)
// 2. Сервер відповідає 101 Switching Protocols
// 3. З'єднання оновлюється до WebSocket протоколу
// 4. Бінарні або текстові фрейми можуть надсилатися в обох напрямках
// 5. Мінімальні витрати (2-14 байт на повідомлення)
// 6. Вбудований ping/pong для перевірки стану з'єднання

// ⚡ Цікавий факт: WebSockets можуть обробляти 50,000+ одночасних з'єднань
// на одному сервері при правильній конфігурації!

// 🎓 Навчальний коментар: Чому WebSockets кращі:
// - Справжній real-time (без затримки)
// - Двоспрямовані (сервер може надсилати в будь-який момент)
// - Ефективні (мінімальні витрати після рукостискання)
// - Постійні (немає витрат на перепідключення)
// - Широко підтримувані (всі сучасні браузери)
// - Ідеально для: чату, ігор, торгівлі, інструментів співпраці
