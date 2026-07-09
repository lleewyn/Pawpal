const express = require('express');
const path = require('path');
const chatApi = require('./scripts/api/chat.js');

const app = express();
const port = 3000;

// Cho phép parse body JSON
app.use(express.json());

// Phục vụ các file tĩnh (html, css, js) từ thư mục gốc
app.use(express.static(path.join(__dirname, '.'), { extensions: ['html'] }));

// Route cho API Chatbot
app.post('/api/chat', async (req, res) => {
    try {
        await chatApi(req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`===========================================`);
    console.log(`PawPal Local Server is running!`);
    console.log(`Vui lòng mở trình duyệt và truy cập:`);
    console.log(`http://localhost:${port}/`);
    console.log(`===========================================`);
});
