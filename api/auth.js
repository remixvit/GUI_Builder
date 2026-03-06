const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function getUsers() {
  let users = await kvGet("users");
  if (!users) {
    const u = process.env.ADMIN_USERNAME || "admin";
    const p = process.env.ADMIN_PASSWORD || "admin";
    users = [{ username: u, passwordHash: await hashPassword(p), role: "admin" }];
    await kvSet("users", users);
  }
  return users;
}

async function verifyUser(username, password) {
  const users = await getUsers();
  const hash  = await hashPassword(password);
  return users.find(u => u.username === username && u.passwordHash === hash) || null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function parseBasicAuth(req) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(h.slice(6));
    const i = decoded.indexOf(":");
    return i < 0 ? null : { username: decoded.slice(0, i), password: decoded.slice(i + 1) };
  } catch { return null; }
}

export const config = { runtime: "edge" };

export default async function handler(req) {
  const url      = new URL(req.url);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }});
  }

  // POST /api/login — проверка логина, возвращает { username, role }
  if (pathname === "/api/login" && req.method === "POST") {
    const { username, password } = await req.json();
    if (!username || !password) return json({ error: "Укажите логин и пароль" }, 400);
    const user = await verifyUser(username, password);
    if (!user) return json({ error: "Неверный логин или пароль" }, 401);
    return json({ username: user.username, role: user.role });
  }

  // Все остальные /api/* — требуют Basic Auth
  const creds = parseBasicAuth(req);
  if (!creds) return unauthorized();
  const user = await verifyUser(creds.username, creds.password);
  if (!user) return unauthorized();

  // GET /api/me
  if (pathname === "/api/me") {
    return json({ username: user.username, role: user.role });
  }

  // Admin: требует роль admin
  if (pathname.startsWith("/api/admin/users")) {
    if (user.role !== "admin") return json({ error: "Нет доступа" }, 403);

    if (req.method === "GET") {
      const users = await getUsers();
      return json(users.map(u => ({ username: u.username, role: u.role })));
    }
    if (req.method === "POST") {
      const { username, password, role = "user" } = await req.json();
      if (!username || !password) return json({ error: "username и password обязательны" }, 400);
      const users = await getUsers();
      if (users.find(u => u.username === username)) return json({ error: "Пользователь уже существует" }, 409);
      users.push({ username, passwordHash: await hashPassword(password), role });
      await kvSet("users", users);
      return json({ ok: true });
    }
    if (req.method === "DELETE") {
      const target = pathname.replace("/api/admin/users/", "");
      if (target === user.username) return json({ error: "Нельзя удалить себя" }, 400);
      const users = await getUsers();
      const filtered = users.filter(u => u.username !== target);
      if (filtered.length === users.length) return json({ error: "Пользователь не найден" }, 404);
      await kvSet("users", filtered);
      return json({ ok: true });
    }
    if (req.method === "PATCH") {
      const target = pathname.replace("/api/admin/users/", "");
      const body = await req.json();
      const users = await getUsers();
      const idx = users.findIndex(u => u.username === target);
      if (idx < 0) return json({ error: "Пользователь не найден" }, 404);
      if (body.password) users[idx].passwordHash = await hashPassword(body.password);
      if (body.role)     users[idx].role = body.role;
      await kvSet("users", users);
      return json({ ok: true });
    }
    return json({ error: "Метод не поддерживается" }, 405);
  }

  return json({ error: "Not found" }, 404);
}
