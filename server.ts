import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    // Database setup
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            userId TEXT,
            userName TEXT,
            action TEXT,
            details TEXT,
            targetId TEXT
        )
    `);

    // Audit Log Endpoints
    app.get("/api/audit-logs", async (req, res) => {
        try {
            const logs = await db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500");
            res.json(logs);
        } catch (error) {
            console.error("Error fetching logs:", error);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    });

    app.post("/api/audit-logs", async (req, res) => {
        const { timestamp, userId, userName, action, details, targetId } = req.body;
        try {
            const result = await db.run(
                "INSERT INTO audit_logs (timestamp, userId, userName, action, details, targetId) VALUES (?, ?, ?, ?, ?, ?)",
                [timestamp, userId, userName, action, details, targetId]
            );
            res.json({ id: result.lastID, ...req.body });
        } catch (error) {
            console.error("Error saving log:", error);
            res.status(500).json({ error: "Failed to save log" });
        }
    });

    // Proxy other requests to the external backend
    const EXTERNAL_API_URL = 'https://4wt9b8zl-5000.use2.devtunnels.ms/api';

    app.all("/api/*all", async (req, res) => {
        const endpoint = req.url.replace('/api', '');
        const targetUrl = `${EXTERNAL_API_URL}${endpoint}`;
        
        try {
            const fetchOptions: RequestInit = {
                method: req.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization || '',
                    'ngrok-skip-browser-warning': 'true'
                }
            };

            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                fetchOptions.body = JSON.stringify(req.body);
            }

            const response = await fetch(targetUrl, fetchOptions);
            
            if (response.status === 204) {
                return res.status(204).send();
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                res.status(response.status).json(data);
            } else {
                const text = await response.text();
                res.status(response.status).send(text);
            }
        } catch (error) {
            console.error(`Proxy error for ${targetUrl}:`, error);
            res.status(500).json({ error: "Proxy error" });
        }
    });

    // Vite middleware
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*all', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
