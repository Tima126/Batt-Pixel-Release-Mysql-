const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public')); // Сервируем статические файлы из папки public

// Конфигурация подключения к базе данных
const dbConfig = {
<<<<<<< HEAD
    host: 'localhost', 
    user: 'root', 
    password: 'Tima2006', 
    database: 'battle_pixe', 
    port: 3306 
=======
    host: 'localhost', // Укажите правильный хост
    user: 'root', // Укажите правильного пользователя
    password: 'Tima2006', // Укажите правильный пароль
    database: 'pixelBattle', // Укажите правильное имя базы данных
    port: 3306 // Порт по умолчанию для MySQL
>>>>>>> parent of 4921863 (GotovoSql)
};

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        const parsedMessage = JSON.parse(message.toString());  // Преобразуем буфер в строку и разбираем JSON
        console.log('Received message:', parsedMessage);

        // Проверяем наличие поля userName и устанавливаем значение по умолчанию, если оно отсутствует
        if (!parsedMessage.userName) {
            parsedMessage.userName = 'Unknown';
        }

        // Сохраняем данные в базу данных
        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows, fields] = await connection.execute(
                'INSERT INTO Pixels (X, Y, Color, UserName) VALUES (?, ?, ?, ?)',
                [parsedMessage.x, parsedMessage.y, parsedMessage.color, parsedMessage.userName]
            );
            connection.end();
        } catch (err) {
            console.error('Database error:', err);
        }

        // Рассылаем сообщение всем подключенным клиентам
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));  // Отправляем сообщение в формате JSON
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});