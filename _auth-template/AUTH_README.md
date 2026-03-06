# Система авторизации для Vite + React на Vercel

## Для ИИ агента: прочитай этот файл и реализуй авторизацию по инструкции ниже.

---

## Что делает эта система

- Экран логина перед загрузкой приложения
- Пользователи хранятся в Upstash Redis (KV) на Vercel
- Пароли хранятся как SHA-256 хеши
- Сессия в `sessionStorage` браузера
- Роли: `admin` и `user`
- Админ-панель для управления пользователями (добавить / удалить / сменить пароль / сменить роль)
- Кнопка выхода

---

## Структура файлов

```
/                          ← корень проекта
├── api/
│   └── auth.js            ← Edge Function (скопировать готовый)
├── vercel.json            ← роутинг (скопировать готовый)
├── AUTH_README.md         ← этот файл
└── src/
    └── App.jsx            ← сюда добавить код авторизации
```

---

## Шаг 1 — Upstash Redis

1. В Vercel Dashboard → **Storage** → нажать на **Upstash** → создать **Redis** базу
2. После создания Vercel автоматически добавит в проект переменные окружения:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Проверить что они появились в **Project → Settings → Environment Variables**

> Если проектов несколько — создать отдельную базу для каждого, либо использовать одну базу
> с разными префиксами ключей (например `myapp_users` вместо `users`).
> Бесплатный план Upstash позволяет до 10 баз.

---

## Шаг 2 — ENV переменные первого админа

В **Vercel → Project → Settings → Environment Variables** добавить вручную:

| Key               | Value              |
|-------------------|--------------------|
| `ADMIN_USERNAME`  | логин администратора |
| `ADMIN_PASSWORD`  | пароль администратора |

При первом запросе к API функция создаст этого пользователя в KV автоматически.

---

## Шаг 3 — Скопировать `api/auth.js`

Файл `api/auth.js` копируется в новый проект **без изменений**.

Если нужен другой префикс ключа (несколько проектов в одной базе),
заменить строку `"users"` на `"myproject_users"` в двух местах:

```js
// в функции getUsers():
let users = await kvGet("users");        // ← заменить "users"
await kvSet("users", users);             // ← заменить "users"
```

---

## Шаг 4 — Скопировать `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/auth" }
  ]
}
```

Этот файл лежит в корне проекта. Все `/api/*` запросы идут в `api/auth.js`.

---

## Шаг 5 — Добавить авторизацию в React приложение

### 5.1 Добавить компонент `LoginScreen`

Вставить **до основного компонента приложения** (например перед `export default function App()`):

```jsx
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (!username || !password) { setError("Введите логин и пароль"); return; }
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (e) {
      setError(e.message || "Ошибка входа");
    }
    setLoading(false);
  };

  const onKey = (e) => { if (e.key === "Enter") submit(); };

  // Стили подобрать под дизайн проекта. Минимальный вариант:
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>
      <div style={{width:320,padding:32,border:"1px solid #ccc",borderRadius:8}}>
        <h2>Вход</h2>
        {error && <div style={{color:"red",marginBottom:12}}>{error}</div>}
        <input value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={onKey}
          placeholder="Логин" style={{display:"block",width:"100%",marginBottom:10,padding:8}} />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={onKey}
          placeholder="Пароль" style={{display:"block",width:"100%",marginBottom:16,padding:8}} />
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:10}}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </div>
    </div>
  );
}
```

### 5.2 Добавить состояние авторизации в основной компонент

В начало функции основного компонента добавить:

```jsx
// Состояние авторизации
const [currentUser, setCurrentUser] = useState(() => {
  try { return JSON.parse(sessionStorage.getItem("hmi_user")) || null; } catch { return null; }
});
const [authCredentials, setAuthCredentials] = useState(() => {
  try { return JSON.parse(sessionStorage.getItem("hmi_creds")) || null; } catch { return null; }
});

// Построить заголовок Basic Auth для API запросов
const authHeader = (creds) => {
  if (!creds) return {};
  return { "Authorization": "Basic " + btoa(`${creds.username}:${creds.password}`) };
};

// Логин
const handleLogin = async (username, password) => {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка входа");
  const user = { username: data.username, role: data.role };
  const creds = { username, password };
  setCurrentUser(user);
  setAuthCredentials(creds);
  sessionStorage.setItem("hmi_user", JSON.stringify(user));
  sessionStorage.setItem("hmi_creds", JSON.stringify(creds));
  return user;
};

// Выход
const handleLogout = () => {
  setCurrentUser(null);
  setAuthCredentials(null);
  sessionStorage.removeItem("hmi_user");
  sessionStorage.removeItem("hmi_creds");
};
```

### 5.3 Показать экран логина если не авторизован

В начале `return` основного компонента добавить:

```jsx
if (!currentUser) {
  return <LoginScreen onLogin={handleLogin} />;
}
```

### 5.4 Добавить кнопку выхода в интерфейс

В любом удобном месте UI:

```jsx
<button onClick={handleLogout}>
  Выйти ({currentUser?.username})
</button>
```

### 5.5 Добавить Admin-панель (опционально)

Добавить состояние и функции для управления пользователями:

```jsx
const [showAdmin, setShowAdmin] = useState(false);
const [adminUsers, setAdminUsers] = useState([]);

const loadAdminUsers = async () => {
  const r = await fetch("/api/admin/users", { headers: authHeader(authCredentials) });
  if (r.ok) setAdminUsers(await r.json());
};

const adminAddUser = async (username, password, role) => {
  await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(authCredentials) },
    body: JSON.stringify({ username, password, role }),
  });
  loadAdminUsers();
};

const adminDeleteUser = async (username) => {
  await fetch(`/api/admin/users/${username}`, {
    method: "DELETE",
    headers: authHeader(authCredentials),
  });
  loadAdminUsers();
};

const adminChangePassword = async (username, password) => {
  await fetch(`/api/admin/users/${username}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(authCredentials) },
    body: JSON.stringify({ password }),
  });
};
```

Кнопку открытия Admin-панели показывать только администратору:

```jsx
{currentUser?.role === "admin" && (
  <button onClick={() => { setShowAdmin(true); loadAdminUsers(); }}>
    Admin
  </button>
)}
```

---

## API эндпоинты

| Метод  | URL                          | Auth          | Описание                        |
|--------|------------------------------|---------------|---------------------------------|
| POST   | `/api/login`                 | —             | Логин. Body: `{username, password}`. Возвращает `{username, role}` |
| GET    | `/api/me`                    | Basic Auth    | Текущий пользователь            |
| GET    | `/api/admin/users`           | Basic Auth (admin) | Список пользователей        |
| POST   | `/api/admin/users`           | Basic Auth (admin) | Добавить. Body: `{username, password, role}` |
| DELETE | `/api/admin/users/:username` | Basic Auth (admin) | Удалить пользователя        |
| PATCH  | `/api/admin/users/:username` | Basic Auth (admin) | Изменить. Body: `{password?, role?}` |

---

## Структура данных в Upstash KV

Ключ: `users` (или кастомный префикс)

Значение — массив пользователей:
```json
[
  {
    "username": "admin",
    "passwordHash": "sha256-hex-string",
    "role": "admin"
  },
  {
    "username": "john",
    "passwordHash": "sha256-hex-string",
    "role": "user"
  }
]
```

---

## Важные замечания

- **Сессия** хранится в `sessionStorage` — при закрытии вкладки нужно войти снова.
  Для постоянной сессии заменить `sessionStorage` на `localStorage`.
- **Безопасность**: статические файлы (JS бандл) технически доступны без авторизации —
  это ограничение Vite на Vercel Hobby плане. Для полной защиты нужен Next.js или платный план.
  Для внутренних инструментов этого достаточно.
- **Сброс пользователей**: если заблокировали себя — зайти в Upstash Dashboard,
  найти ключ `users` и отредактировать JSON вручную или удалить
  (тогда пересоздастся из ENV переменных `ADMIN_USERNAME` / `ADMIN_PASSWORD`).
