document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const bufferCanvas = document.createElement('canvas');
    const bufferCtx = bufferCanvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');
    const clearButton = document.getElementById('clearButton');

    const canvasContainer = document.querySelector('.canvas-container');
    const coordinatesElement = document.getElementById('coordinates');
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
  
    const socket = new WebSocket('ws://192.168.251.36:3000'); 
  
    const pixelSize = 10; // Размер пикселя
    const drawCooldown = 10000; 
  
    bufferCanvas.width = canvas.width;
    bufferCanvas.height = canvas.height;
  
    let isDragging = false;
    let startX, startY;
    let offsetX = 0, offsetY = 0;
    let pixels = {}; // Объект для хранения цветов пикселей
    let scale = 1; // Масштаб холста
    let isTouchDrawing = false; // Флаг для рисования при касании экрана
    let isDrawing = false; // Флаг для рисования мышью
    
    
   
    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
    });
  
    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
    });
  
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
  
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
  
        if (message.type === 'init') {
            message.state.forEach(({ x, y, color }) => drawPixel(x, y, color));
        } else if (message.clear) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
            saveCanvasState(); // Сохраняем состояние после очистки
        } else {
            const { x, y, color } = message;
            drawPixel(x, y, color);
            saveCanvasState(); // Сохраняем состояние после рисования
        }
    });
  
    function drawPixel(x, y, color) {
        bufferCtx.fillStyle = color;
        bufferCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        ctx.drawImage(bufferCanvas, 0, 0);
        pixels[`${x},${y}`] = color; // Сохраняем цвет пикселя
    }
  
    function canDraw() {
        const now = Date.now();
        return now - getLastDrawTime() >= drawCooldown;
    }
  
    function getLastDrawTime() {
        const lastDrawTime = localStorage.getItem('lastDrawTime');
        return lastDrawTime ? parseInt(lastDrawTime, 10) : 0;
    }
  
    function updateTimer() {
        const now = Date.now();
        const lastDrawTime = getLastDrawTime();
        const remainingTime = Math.max(0, drawCooldown - (now - lastDrawTime));
        const seconds = Math.ceil(remainingTime / 1000);
        timerElement.textContent = seconds;
    }
  
    function saveCanvasState() {
        const canvasImage = bufferCanvas.toDataURL();
        localStorage.setItem('canvasState', canvasImage);
        localStorage.setItem('pixelsState', JSON.stringify(pixels)); // Сохраняем состояние пикселей
    }
  
    function loadCanvasState() {
        const savedState = localStorage.getItem('canvasState');
        const savedPixels = localStorage.getItem('pixelsState');
        if (savedState) {
            const image = new Image();
            image.src = savedState;
            image.onload = () => {
                bufferCtx.drawImage(image, 0, 0);
                ctx.drawImage(bufferCanvas, 0, 0);
            };
        }
        if (savedPixels) {
            pixels = JSON.parse(savedPixels);
        }
    }
  
    clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bufferCtx.clearRect(0, 0, bufferCanvas.width, bufferCanvas.height);
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ clear: true })); // Сообщаем другим клиентам очистить холст
        }
        saveCanvasState(); // Сохраняем состояние после очистки
    });
  
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Левая кнопка мыши
            if (canDraw()) {
                canvasContainer.style.cursor = 'default';
                isDrawing = true; // Устанавливаем флаг рисования
                draw(event);
            }
        } else if (event.button === 1 || event.button === 2) { // Средняя или правая кнопка мыши
            isDragging = false;
            startX = event.clientX;
            startY = event.clientY;
            canvasContainer.style.cursor = 'grab';
        }
    });
  
    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (pixelSize * scale));
        const y = Math.floor((event.clientY - rect.top) / (pixelSize * scale));
        
        // Присваиваем координаты для отображения
        coordinatesElement.textContent = `X: ${x}, Y: ${y}`;
        
        if (isDragging) {
            offsetX += event.clientX - startX;
            offsetY += event.clientY - startY;
            canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            startX = event.clientX;
            startY = event.clientY;
        } else if (isDrawing) {
            draw(event); // Вызываем функцию рисования только если рисуем
        }
    });
    
  
    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) { // Левая кнопка мыши
            isDrawing = false; // Сбрасываем флаг рисования
        } else if (event.button === 1 || event.button === 2) { // Средняя или правая кнопка мыши
            isDragging = false;
            canvasContainer.style.cursor = 'grab';
        }
    });

    // Добавляем поддержку касаний для мобильных устройств
    canvas.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        if (canDraw()) {
            isTouchDrawing = true;
            draw({ clientX: touch.clientX, clientY: touch.clientY });
        }
    });
  
    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Предотвращаем прокрутку при рисовании
        if (isTouchDrawing) {
            const touch = event.touches[0];
            draw({ clientX: touch.clientX, clientY: touch.clientY });
        }
    });
  
    canvas.addEventListener('touchend', () => {
        isTouchDrawing = false;
    });
  
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        isDrawing = false; // Сбрасываем флаг рисования
        canvasContainer.style.cursor = 'default';
        coordinatesElement.textContent = `X: 0, Y: 0`;
    });
  
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Предотвращаем появление контекстного меню
    });
  
    function draw(event) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (pixelSize * scale));
        const y = Math.floor((event.clientY - rect.top) / (pixelSize * scale));
        const color = colorPicker.value;
  
        drawPixel(x, y, color);
        localStorage.setItem('lastDrawTime', Date.now().toString()); // Обновляем время последнего рисования
  
        saveCanvasState(); // Сохраняем состояние после рисования
  
        // Отправляем данные на сервер через WebSocket
        if (socket.readyState === WebSocket.OPEN) {
            const data = JSON.stringify({ x, y, color, userName });
            socket.send(data);
        } else {
            console.error('WebSocket is not open. Unable to send data.');
        }
    }
  
    zoomInButton.addEventListener('click', () => {
        // Увеличиваем масштаб холста
        scale += 0.1;
        adjustOffsetForZoom(0.1);
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    });
  
    zoomOutButton.addEventListener('click', () => {
        // Уменьшаем масштаб холста
        scale -= 0.1;
        adjustOffsetForZoom(-0.1);
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    });
  
    function adjustOffsetForZoom(delta) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = rect.width / 2; // Центр холста по горизонтали
        const mouseY = rect.height / 2; // Центр холста по вертикали
        const scaleFactor = 1 - delta;
        offsetX = mouseX - (mouseX - offsetX) * scaleFactor;
        offsetY = mouseY - (mouseY - offsetY) * scaleFactor;
    }

    function handleWheel(event) {
        event.preventDefault();
        const zoomFactor = 0.1;
        const delta = event.deltaY > 0 ? -zoomFactor : zoomFactor;
        scale += delta;
        scale = Math.max(0.5, Math.min(scale, 3)); // Ограничиваем масштаб от 0.5 до 3

        // Вычисляем смещение, чтобы масштабирование происходило относительно текущей позиции курсора
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const scaleFactor = 1 - delta;
        offsetX = mouseX - (mouseX - offsetX) * scaleFactor;
        offsetY = mouseY - (mouseY - offsetY) * scaleFactor;

        // Применяем смещение и масштаб к холсту
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    canvas.addEventListener('wheel', handleWheel);
  
    // Восстанавливаем состояние холста при загрузке страницы
    loadCanvasState();
  
    // Обновляем таймер сразу после загрузки состояния
    updateTimer();
  
    // Убедитесь, что таймер обновляется каждую секунду
    setInterval(updateTimer, 1000);
});