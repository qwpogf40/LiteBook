import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const db = new Database("litebook_v4.db");
db.pragma('foreign_keys = ON');
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev-only";

// Initialize Database with expanded schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    gender TEXT,
    dob TEXT,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    profile_visibility TEXT DEFAULT 'public',
    show_online_status INTEGER DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Helper to ensure settings exist
const ensureSettings = (userId: number) => {
  const settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
  if (!settings) {
    db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(userId);
  }
};

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://picsum.photos"],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'", "https://*.google.com", "https://*.run.app", "https://aistudio.google", "https://*.aistudio.google"],
    },
  },
  frameguard: false, // Disable X-Frame-Options to allow CSP frame-ancestors to take over
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const insert = db.prepare("INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)");
    insert.run(username, hashedPassword, display_name);
    res.status(201).json({ message: "User registered" });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    // Record login history
    db.prepare("INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)")
      .run(user.id, req.ip, req.get('user-agent'));

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ id: user.id, username: user.username, display_name: user.display_name });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out" });
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  const user: any = db.prepare("SELECT id, username, display_name, gender, dob, avatar_url FROM users WHERE id = ?").get(req.user.id);
  ensureSettings(req.user.id);
  const settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.user.id);
  res.json({ ...user, settings });
});

// Settings Routes
app.get("/api/settings", authenticateToken, (req: any, res) => {
  ensureSettings(req.user.id);
  const settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.user.id);
  res.json(settings);
});

app.patch("/api/settings", authenticateToken, (req: any, res) => {
  const { language, theme, profile_visibility, show_online_status } = req.body;
  try {
    const update = db.prepare(`
      UPDATE user_settings 
      SET language = COALESCE(?, language),
          theme = COALESCE(?, theme),
          profile_visibility = COALESCE(?, profile_visibility),
          show_online_status = COALESCE(?, show_online_status)
      WHERE user_id = ?
    `);
    update.run(language, theme, profile_visibility, show_online_status, req.user.id);
    const updatedSettings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.user.id);
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Security Routes
app.get("/api/security/history", authenticateToken, (req: any, res) => {
  try {
    const history = db.prepare("SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(req.user.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch login history" });
  }
});

app.post("/api/security/change-password", authenticateToken, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user: any = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: "Current password incorrect" });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.id);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Data Export (Privacy Center)
app.get("/api/privacy/export", authenticateToken, (req: any, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    const posts = db.prepare("SELECT * FROM posts WHERE user_id = ?").all(req.user.id);
    const messages = db.prepare("SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?").all(req.user.id, req.user.id);
    const friends = db.prepare("SELECT * FROM friends WHERE user_id = ? OR friend_id = ?").all(req.user.id, req.user.id);
    
    res.json({
      profile: user,
      posts,
      messages,
      friends,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Export failed" });
  }
});

app.delete("/api/privacy/delete-account", authenticateToken, (req: any, res) => {
  try {
    const userId = req.user.id;
    // With ON DELETE CASCADE, we only need to delete the user
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    
    res.clearCookie('token');
    res.json({ message: "Account and all data deleted successfully" });
  } catch (error) {
    console.error("Deletion error:", error);
    res.status(500).json({ error: "Deletion failed" });
  }
});

// Profile Routes
app.patch("/api/profile", authenticateToken, (req: any, res) => {
  const { display_name, gender, dob, avatar_url } = req.body;
  try {
    const update = db.prepare(`
      UPDATE users 
      SET display_name = COALESCE(?, display_name),
          gender = COALESCE(?, gender),
          dob = COALESCE(?, dob),
          avatar_url = COALESCE(?, avatar_url)
      WHERE id = ?
    `);
    update.run(display_name, gender, dob, avatar_url, req.user.id);
    const updatedUser = db.prepare("SELECT id, username, display_name, gender, dob, avatar_url FROM users WHERE id = ?").get(req.user.id);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// User Search (for finding friends)
app.get("/api/users/search", authenticateToken, (req: any, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.json([]);
  try {
    const users = db.prepare(`
      SELECT id, username, display_name, avatar_url 
      FROM users 
      WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, req.user.id);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Friend Routes
app.get("/api/friends", authenticateToken, (req: any, res) => {
  try {
    const friends = db.prepare(`
      SELECT users.id, users.username, users.display_name, users.avatar_url, friends.status
      FROM friends
      JOIN users ON (friends.friend_id = users.id OR friends.user_id = users.id)
      WHERE (friends.user_id = ? OR friends.friend_id = ?) AND users.id != ?
    `).all(req.user.id, req.user.id, req.user.id);
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

app.post("/api/friends/request", authenticateToken, (req: any, res) => {
  const { friend_id } = req.body;
  if (!friend_id || friend_id === req.user.id) return res.status(400).json({ error: "Invalid friend ID" });
  
  try {
    // Check if friend exists
    const friend = db.prepare("SELECT id FROM users WHERE id = ?").get(friend_id);
    if (!friend) return res.status(404).json({ error: "User not found" });

    const insert = db.prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')");
    insert.run(req.user.id, friend_id);
    res.json({ message: "Friend request sent" });
  } catch (error) {
    res.status(400).json({ error: "Request already exists" });
  }
});

app.post("/api/friends/accept", authenticateToken, (req: any, res) => {
  const { friend_id } = req.body;
  try {
    const update = db.prepare("UPDATE friends SET status = 'accepted' WHERE friend_id = ? AND user_id = ?");
    update.run(req.user.id, friend_id);
    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to accept request" });
  }
});

// Message Routes
app.get("/api/messages/:other_id", authenticateToken, (req: any, res) => {
  const { other_id } = req.params;
  try {
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(req.user.id, other_id, other_id, req.user.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", authenticateToken, (req: any, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content || content.length > 2000) {
    return res.status(400).json({ error: "Invalid message" });
  }
  try {
    // Check if receiver exists
    const receiver = db.prepare("SELECT id FROM users WHERE id = ?").get(receiver_id);
    if (!receiver) return res.status(404).json({ error: "Recipient not found" });

    const insert = db.prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)");
    const result = insert.run(req.user.id, receiver_id, content);
    const newMessage = db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Post Routes
app.get("/api/posts", (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT posts.*, users.display_name 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      ORDER BY created_at DESC
    `).all();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.post("/api/posts", authenticateToken, (req: any, res) => {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.length > 1000) {
    return res.status(400).json({ error: "Invalid content" });
  }

  try {
    // IDOR Protection: Always use req.user.id from the verified JWT
    const insert = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
    const result = insert.run(req.user.id, content);
    
    const newPost = db.prepare(`
      SELECT posts.*, users.display_name 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Delete post with IDOR check
app.delete("/api/posts/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  try {
    const post: any = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    
    // IDOR Protection: Check if the post belongs to the authenticated user
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this post" });
    }

    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Litebook server running on http://localhost:${PORT}`);
  });
}

startServer();
