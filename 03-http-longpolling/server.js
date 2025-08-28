// 🎓 Навчальний коментар: Ласкаво просимо до Прикладу 3 - HTTP Довге Опитування!
// Це значне покращення порівняно з коротким опитуванням. Замість того, щоб клієнт
// постійно питав "Є нові повідомлення?", сервер тримає запит відкритим,
// доки не з'явиться щось нове для відправки.

const express = require('express');
const path = require('path');

// 🔧 Технічний коментар: Створюємо Express додаток
const app = express();
const PORT = 3000;

// 🔧 Технічний коментар: Зберігання повідомлень в пам'яті
const messages = [];

// 🎓 Навчальний коментар: Ключова відмінність - ми зберігаємо очікуючих клієнтів!
// Об'єкт відповіді кожного клієнта утримується, доки не з'являться нові дані
const waitingClients = [];

// 🔧 Технічний коментар: Конфігурація
const LONG_POLL_TIMEOUT = 30000; // 30 секунд таймаут

// 🔧 Технічний коментар: Налаштування middleware
app.use(express.json());
app.use(express.static(__dirname));

// 🎓 Навчальний коментар: Звичайний ендпоінт для отримання початкових повідомлень
app.get('/messages', (req, res) => {
    console.log(`📥 Початкове завантаження - Відправляємо ${messages.length} повідомлень`);
    res.json(messages);
});

// 🎓 Навчальний коментар: Це магія - ендпоінт довгого опитування!
// Сервер тримає цей запит відкритим, доки не прийдуть нові повідомлення
app.get('/subscribe', (req, res) => {
    // 🔧 Технічний коментар: Отримуємо ID останнього повідомлення, яке має клієнт
    const lastMessageId = parseInt(req.query.lastId) || 0;
    
    console.log(`🔌 Нове довге опитування (клієнт має повідомлення до #${lastMessageId})`);
    
    // 🎓 Навчальний коментар: Перевіряємо, чи вже є нові повідомлення
    const newMessages = messages.filter(msg => msg.id > lastMessageId);
    
    if (newMessages.length > 0) {
        // 🔧 Технічний коментар: Відправляємо одразу, якщо маємо нові повідомлення
        console.log(`📤 Відправляємо ${newMessages.length} нових повідомлень одразу`);
        return res.json(newMessages);
    }
    
    // 🎓 Навчальний коментар: Немає нових повідомлень - утримуємо це з'єднання!
    // Це ключова відмінність від короткого опитування
    const client = {
        id: Date.now() + Math.random(), // Простий унікальний ID
        response: res,
        lastMessageId: lastMessageId,
        timestamp: Date.now()
    };
    
    waitingClients.push(client);
    console.log(`⏳ Утримуємо з'єднання - ${waitingClients.length} клієнтів очікують`);
    
    // 🎓 Навчальний коментар: Встановлюємо таймаут, щоб запобігти нескінченному очікуванню
    const timeout = setTimeout(() => {
        // 🔧 Технічний коментар: Видаляємо цього клієнта зі списку очікуючих
        const index = waitingClients.findIndex(c => c.id === client.id);
        if (index !== -1) {
            waitingClients.splice(index, 1);
            console.log(`⏱️ Таймаут для клієнта - ${waitingClients.length} клієнтів залишилось`);
            
            // 🔧 Технічний коментар: Відправляємо порожню відповідь з 204 No Content
            res.status(204).end();
        }
    }, LONG_POLL_TIMEOUT);
    
    // 🎓 Навчальний коментар: Очищаємо, якщо клієнт від'єднається
    req.on('close', () => {
        clearTimeout(timeout);
        const index = waitingClients.findIndex(c => c.id === client.id);
        if (index !== -1) {
            waitingClients.splice(index, 1);
            console.log(`🔌 Клієнт від'єднався - ${waitingClients.length} клієнтів залишилось`);
        }
    });
});

// 🎓 Навчальний коментар: Модифікований POST ендпоінт, який сповіщає очікуючих клієнтів
app.post('/messages', (req, res) => {
    const { user, text } = req.body;
    
    // ⚠️ Попередження: Валідуйте ввід у продакшені!
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Текст повідомлення обов\'язковий' });
    }
    
    const message = {
        id: messages.length + 1,
        user: user || 'Анонім',
        text: text.trim(),
        timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    console.log(`💬 Нове повідомлення від ${message.user}: ${message.text}`);
    
    // 🎓 Навчальний коментар: Це ключовий момент - сповіщаємо всіх очікуючих клієнтів!
    // Саме це робить довге опитування "реальним часом"
    console.log(`🔔 Сповіщаємо ${waitingClients.length} очікуючих клієнтів...`);
    
    waitingClients.forEach(client => {
        // 🔧 Технічний коментар: Відправляємо нові повідомлення кожному очікуючому клієнту
        const newMessages = messages.filter(msg => msg.id > client.lastMessageId);
        
        try {
            client.response.json(newMessages);
            console.log(`✅ Сповістили клієнта про ${newMessages.length} нових повідомлень`);
        } catch (error) {
            // Клієнт міг від'єднатися
            console.log(`❌ Не вдалося сповістити клієнта: ${error.message}`);
        }
    });
    
    // 🔧 Технічний коментар: Очищаємо масив очікуючих клієнтів
    waitingClients.length = 0;
    
    res.status(201).json({ success: true, message });
});

// 🎓 Навчальний коментар: Ендпоінт для показу статистики довгого опитування
app.get('/stats', (req, res) => {
    res.json({
        totalMessages: messages.length,
        waitingClients: waitingClients.length,
        oldestWaitingTime: waitingClients.length > 0 
            ? Math.floor((Date.now() - Math.min(...waitingClients.map(c => c.timestamp))) / 1000) + 'с'
            : 'Н/Д'
    });
});

// 🔧 Технічний коментар: Запускаємо сервер
app.listen(PORT, () => {
    console.log(`🚀 HTTP сервер довгого опитування працює на http://localhost:${PORT}`);
    console.log('📝 Приклад 3: Сервер утримує запити, доки не прийдуть нові повідомлення');
    console.log(`⏱️ Таймаут довгого опитування: ${LONG_POLL_TIMEOUT / 1000} секунд`);
    
    console.log('\n✨ Переваги довгого опитування:');
    console.log('   - Майже миттєві оновлення (немає затримки опитування)');
    console.log('   - Набагато ефективніше (немає порожніх відповідей)');
    console.log('   - Менше навантаження на сервер (менше запитів)');
    console.log('   - Все ще використовує стандартний HTTP\n');
    
    console.log('⚠️  Виклики довгого опитування:');
    console.log('   - Складніша реалізація на сервері');
    console.log('   - Потрібне управління з\'єднаннями');
    console.log('   - Може досягти лімітів з\'єднань');
    console.log('   - Потрібна логіка перепідключення на клієнті\n');
});

// 🎓 Навчальний коментар: Довге опитування в реальному світі:
// - Використовувалося багатьма чат-застосунками до WebSockets
// - Facebook чат використовував довге опитування роками
// - Все ще корисне, коли WebSockets недоступні
// - Гарний запасний варіант для обмежень файрвола

// ⚡ Цікавий факт: Довге опитування іноді називають "Comet" або
// "Reverse Ajax", тому що сервер "проштовхує" дані клієнту!
