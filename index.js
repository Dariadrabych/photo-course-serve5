const express = require('express');
const cors = require('cors');
require('dotenv').config();
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const serviceAccount = require('./firebase-adminsdk.json');

// Ініціалізація Express
const app = express();

// ✅ Дозволити запити з Netlify
app.use(cors({
  origin: 'https://fancy-bunny-36d353.netlify.app'
}));

app.use(express.json());

// ✅ Статичні файли (index.html, main.js) — якщо треба
app.use(express.static(path.join(__dirname, 'public')));

// Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Тимчасове сховище користувачів (для тесту)
const users = [];

// ✅ Middleware: перевірка JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader); // Логування

  if (!authHeader) {
    console.warn('❌ Відсутній заголовок авторизації');
    return res.status(403).send('Token missing');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT decoded:', decoded); // Логування
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ JWT error:', err.message); // Логування
    res.status(403).send('Invalid token');
  }
}

// Головна перевірка сервера
app.get('/', (req, res) => {
  res.send('Сервер працює!');
});

// 👉 Реєстрація користувача
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });
  res.status(201).send('Користувач зареєстрований');
});

// 👉 Вхід користувача
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Невірні дані' });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET);
  res.json({ token });
});

// 👉 Профіль користувача
app.get('/auth/profile', verifyToken, async (req, res) => {
  res.json({ email: req.user.email });
});

// 👉 Збереження уроку
app.post('/lessons', verifyToken, async (req, res) => {
  const { lessonId, date } = req.body;
  try {
    await db.collection('progress').add({
      email: req.user.email,
      lessonId,
      date: new Date(date)
    });
    res.status(200).send('Урок збережено');
  } catch (err) {
    console.error('❌ Firestore error:', err.message);
    res.status(500).send('Помилка сервера');
  }
});

// 👉 Отримання списку уроків
app.get('/lessons', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('progress')
      .where('email', '==', req.user.email)
      .orderBy('date', 'desc')
      .get();
    const lessons = snapshot.docs.map(doc => doc.data());
    res.json(lessons);
  } catch (err) {
    console.error('❌ Firestore read error:', err.message);
    res.status(500).send('Помилка при отриманні даних');
  }
});

// 🟢 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер працює на порту ${PORT}`);
});

