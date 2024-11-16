const ws = new WebSocket('ws://192.168.1.5:3000');

// Отправляем информацию о типе устройства
ws.onopen = () => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    ws.send(JSON.stringify({ type: 'init', device: isMobile ? 'phone' : 'desktop' }));
};

// Получение данных для отображения на холсте
ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === 'pixel') {
        drawPixel(data.x, data.y, data.color);
    }
};

function drawPixel(x, y, color) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(x * 10, y * 10, 10, 10); // Отрисовываем пиксель
}
