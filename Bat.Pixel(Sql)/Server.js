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

// Маршрут для очистки холста
app.get('/clear', (req, res) => {
    // Отправляем команду всем подключенным клиентам для очистки холста
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
            console.log('Data saved to database:', rows);
            connection.end();
        } catch (err) {
            console.error('Database error:', err);
        }

        // Отправляем обновленную информацию всем клиентам
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

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
