// 🎓 Навчальний коментар: Ласкаво просимо до Прикладу 4 - WebSockets!
// Це вершина веб-комунікації в реальному часі. WebSockets забезпечують
// постійне, двоспрямоване з'єднання між клієнтом і сервером.
// Повідомлення надходять миттєво в обох напрямках з мінімальними витратами.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// 🔧 Технічний коментар: Створюємо Express застосунок і HTTP сервер
const app = express();
const server = http.createServer(app);

// 🎓 Навчальний коментар: Створюємо WebSocket сервер, приєднаний до HTTP сервера
// Це дозволяє використовувати і HTTP, і WebSocket на одному порту
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// 🔧 Технічний коментар: Зберігання в пам'яті
const messages = [];
const clients = new Map(); // Відстежуємо підключених клієнтів

// 🔧 Технічний коментар: Middleware
app.use(express.json());
app.use(express.static(__dirname));

// 🎓 Навчальний коментар: HTTP ендпоінт для початкового завантаження повідомлень
// Навіть з WebSockets нам часто потрібен HTTP для початкових даних
app.get('/messages', (req, res) => {
    console.log(`📥 HTTP: Sending ${messages.length} initial messages`);
    res.json(messages);
});

// 🎓 Навчальний коментар: Обробник WebSocket з'єднання
// Ось де відбувається магія!
wss.on('connection', (ws, req) => {
    // 🔧 Технічний коментар: Витягуємо ім'я користувача з рядка запиту
    const url = new URL(req.url, `http://${req.headers.host}`);
    const username = url.searchParams.get('user') || 'Анонім';
    
    // 🔧 Технічний коментар: Створюємо об'єкт клієнта
    const client = {
        id: Date.now() + Math.random(),
        username: username,
        ws: ws,
        connectedAt: new Date()
    };
    
    clients.set(client.id, client);
    console.log(`🔌 WebSocket: ${username} connected (${clients.size} total clients)`);
    
    // 🎓 Навчальний коментар: Надсилаємо привітальне повідомлення підключеному клієнту
    ws.send(JSON.stringify({
        type: 'welcome',
        message: `Welcome ${username}! You are connected via WebSocket.`,
        connectedClients: clients.size
    }));
    
    // 🎓 Навчальний коментар: Надсилаємо список поточних користувачів новому клієнту
    const currentUsers = Array.from(clients.values()).map(c => c.username);
    ws.send(JSON.stringify({
        type: 'user_list',
        users: currentUsers
    }));
    
    // 🎓 Навчальний коментар: Повідомляємо всіх клієнтів про нове з'єднання
    broadcast({
        type: 'user_joined',
        username: username,
        connectedClients: clients.size,
        timestamp: new Date().toISOString()
    }, client.id); // Виключаємо нового клієнта
    
    // 🎓 Навчальний коментар: Обробляємо вхідні повідомлення від цього клієнта
    ws.on('message', (data) => {
        try {
            const payload = JSON.parse(data);
            console.log(`📨 WebSocket: Message from ${username}:`, payload);
            
            // 🔧 Технічний коментар: Обробляємо різні типи повідомлень
            switch (payload.type) {
                case 'message':
                    handleChatMessage(client, payload);
                    break;
                    
                case 'ping':
                    // 🎓 Навчальний коментар: Відповідаємо на ping для підтримки з'єднання
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                default:
                    console.log(`⚠️ Unknown message type: ${payload.type}`);
            }
            
        } catch (error) {
            console.error('❌ Error processing message:', error);
        }
    });
    
    // 🎓 Навчальний коментар: Обробляємо відключення клієнта
    ws.on('close', () => {
        clients.delete(client.id);
        console.log(`👋 WebSocket: ${username} disconnected (${clients.size} remaining)`);
        
        // Сповіщаємо залишкових клієнтів
        broadcast({
            type: 'user_left',
            username: username,
            connectedClients: clients.size,
            timestamp: new Date().toISOString()
        });
    });
    
    // 🎓 Навчальний коментар: Обробляємо помилки WebSocket
    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${username}:`, error.message);
    });
    
    // 🎓 Навчальний коментар: Надсилаємо heartbeat кожні 30 секунд
    // Це підтримує з'єднання активним через проксі/файрволи
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);
});

// 🎓 Навчальний коментар: Обробляємо повідомлення чату
function handleChatMessage(client, payload) {
    // 🔧 Технічний коментар: Створюємо об'єкт повідомлення
    const message = {
        id: messages.length + 1,
        user: client.username,
        text: payload.text,
        timestamp: new Date().toISOString()
    };
    
    // 🔧 Технічний коментар: Зберігаємо повідомлення
    messages.push(message);
    
    // 🎓 Навчальний коментар: Розсилаємо ВСІМ підключеним клієнтам
    // Ось у чому краса WebSockets - миттєва доставка!
    const messageData = {
        type: 'message',
        message: message
    };
    
    // Надсилаємо всім клієнтам, включаючи відправника
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(messageData));
        }
    });
    
    console.log(`✨ Broadcasted message to ${clients.size} clients instantly!`);
}

// 🎓 Навчальний коментар: Допоміжна функція для розсилки
function broadcast(data, excludeClientId = null) {
    const message = JSON.stringify(data);
    
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
        }
    });
}

// 🎓 Навчальний коментар: Ендпоінт статистики для моніторингу
app.get('/stats', (req, res) => {
    const clientList = Array.from(clients.values()).map(client => ({
        username: client.username,
        connectedDuration: Math.floor((Date.now() - client.connectedAt) / 1000) + 's'
    }));
    
    res.json({
        totalMessages: messages.length,
        connectedClients: clients.size,
        clients: clientList,
        serverUptime: Math.floor(process.uptime()) + 's'
    });
});

// 🔧 Технічний коментар: Запускаємо сервер
server.listen(PORT, () => {
    console.log(`🚀 WebSocket Server running on http://localhost:${PORT}`);
    console.log('📝 Приклад 4: Справжня двоспрямована комунікація в реальному часі');
    console.log('🔌 WebSocket ендпоінт: ws://localhost:' + PORT);
    
    console.log('\n✨ WebSocket Advantages:');
    console.log('   - True real-time (messages delivered instantly)');
    console.log('   - Bidirectional (server can push anytime)');
    console.log('   - Minimal overhead (no HTTP headers after handshake)');
    console.log('   - Persistent connection (no reconnection needed)');
    console.log('   - Efficient (binary or text data)');
    
    console.log('\n⚠️  WebSocket Considerations:');
    console.log('   - Requires WebSocket support (modern browsers have it)');
    console.log('   - May be blocked by some proxies/firewalls');
    console.log('   - Need to handle reconnection on client');
    console.log('   - Stateful (server must track connections)\n');
});

// 🎓 Навчальний коментар: WebSockets у продакшені:
// - Використовуються: Slack, Discord, торгові платформи, онлайн ігри
// - Масштабування: використовуйте Redis pub/sub для кількох серверів
// - Безпека: валідуйте/очищайте всі повідомлення
// - Запасний варіант: забезпечте довге опитування як резерв

// ⚡ Цікавий факт: WebSocket протокол виконує спеціальне "рукостискання"
// починаючи як HTTP, а потім оновлюючись до WebSocket. Ви можете побачити
// це в інструментах розробника браузера як "101 Switching Protocols"!
