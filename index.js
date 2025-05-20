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
app.use(cors());
app.use(express.json());

// Хостинг статичних файлів (index.html, main.js)
app.use(express.static(path.join(__dirname, 'public')));

// Ініціалізація Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Тимчасове сховище користувачів (без бази даних)
const users = [];

// Middleware для перевірки JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(403);
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.sendStatus(403);
  }
}

// Головна сторінка (перевірка сервера)
app.get('/', (req, res) => {
  res.send('Сервер працює!');
});

// Реєстрація користувача
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  users.push({ email, password: hashed });
  res.status(201).send('Користувач зареєстрований');
});

// Вхід користувача
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Невірні дані' });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET);
  res.json({ token });
});

// Отримання профілю користувача
app.get('/auth/profile', verifyToken, async (req, res) => {
  res.json({ email: req.user.email });
});

// Збереження пройденого уроку
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
    res.status(500).send('Помилка сервера');
  }
});

// Отримання списку пройдених уроків
app.get('/lessons', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('progress')
      .where('email', '==', req.user.email)
      .orderBy('date', 'desc')
      .get();
    const lessons = snapshot.docs.map(doc => doc.data());
    res.json(lessons);
  } catch (err) {
    res.status(500).send('Помилка при отриманні даних');
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер працює на порту ${PORT}`);
});
