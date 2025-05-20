let token = null;

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  token = data.token;
  alert('Успішно увійшли');
}

async function saveLesson() {
  const lessonId = document.getElementById('lessonId').value;
  const res = await fetch('/lessons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ lessonId, date: new Date().toISOString() })
  });

  alert(await res.text());
}

async function loadLessons() {
  const res = await fetch('/lessons', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  const data = await res.json();
  const list = document.getElementById('lessonList');
  list.innerHTML = '';
  data.forEach(lesson => {
    const li = document.createElement('li');
    li.innerText = `${lesson.lessonId} — ${new Date(lesson.date).toLocaleString()}`;
    list.appendChild(li);
  });
}
