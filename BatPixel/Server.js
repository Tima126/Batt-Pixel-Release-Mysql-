const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

let canvasState = {}; // Объект для хранения состояния холста

// Маршрут для очистки холста
app.get('/clear', (req, res) => {
    canvasState = {}; // Очищаем состояние холста
    // Отправляем всем клиентам команду очистки
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ clear: true }));
        }
    });
    console.log('Canvas clear command sent to all clients');
    res.send('Canvas cleared');
});

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Отправляем текущие данные холста новому клиенту
    ws.send(JSON.stringify({ type: 'init', state: Object.entries(canvasState).map(([key, value]) => ({ x: key.split(',')[0], y: key.split(',')[1], color: value })) }));

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);

        if (!parsedMessage.userName) {
            parsedMessage.userName = 'Unknown';
        }

        // Обрабатываем команду на очистку холста
        if (parsedMessage.clear) {
            canvasState = {}; // Очищаем холст
            // Отправляем команду очистки всем клиентам
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ clear: true }));
                }
            });
            console.log('Canvas cleared');
            return;
        }

        // Обновляем состояние холста
        canvasState[`${parsedMessage.x},${parsedMessage.y}`] = parsedMessage.color;

        // Отправляем обновление всем клиентам
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
