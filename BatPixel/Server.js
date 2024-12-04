const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const dbConfig = {
    host: 'localhost', 
    user: 'root', 
    password: 'Tima2006', 
    database: 'battle_pixe', 
    port: 3306 
};

let canvasState = {}; 

// Маршрут для очистки холста
app.get('/clear', async (req, res) => {
    try {
        // Очищаем базу данных
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM Pixels');
        connection.end();

        // Очищаем состояние холста
        canvasState = {}; 

        // Отправляем команду очистки всем клиентам
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ clear: true })); 
            }
        });

        console.log('Canvas clear command sent to all clients');
        res.send('Canvas cleared');
    } catch (err) {
        console.error('Error clearing canvas:', err);
        res.status(500).send('Error clearing canvas');
    }
});

wss.on('connection', async (ws) => {
    console.log('Client connected');

    try {
        // Получаем текущее состояние холста из базы данных
        const connection = await mysql.createConnection(dbConfig);
        const [rows, fields] = await connection.execute('SELECT X, Y, Color FROM Pixels');
        connection.end();

        // Обновляем состояние холста
        rows.forEach((row) => {
            canvasState[`${row.X},${row.Y}`] = row.Color;
        });

        // Отправляем текущее состояние холста новому клиенту
        ws.send(JSON.stringify({ type: 'init', state: rows }));
    } catch (err) {
        console.error('Database error:', err);
    }

    ws.on('message', async (message) => {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);

        if (!parsedMessage.userName) {
            parsedMessage.userName = 'Unknown';
        }

        try {
            const connection = await mysql.createConnection(dbConfig);
            const [rows, fields] = await connection.execute(
                'INSERT INTO Pixels (X, Y, Color, UserName) VALUES (?, ?, ?, ?)',
                [parsedMessage.x, parsedMessage.y, parsedMessage.color, parsedMessage.userName]
            );
            connection.end();

            // Обновляем состояние холста
            canvasState[`${parsedMessage.x},${parsedMessage.y}`] = parsedMessage.color;

            // Отправляем обновление всем клиентам
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedMessage));
                }
            });
        } catch (err) {
            console.error('Database error:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});