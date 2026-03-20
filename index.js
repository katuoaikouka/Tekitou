import express from "express";
import basicAuth from "express-basic-auth";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import cookieParser from 'cookie-parser';
import session from "express-session";
import dotenv from 'dotenv';
import { createServer } from "http";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import fs from "fs";

// 各種プロキシ・トランスポートのインポート
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import alloy from "alloyproxy";

// セキュリティ関連
import { doubleCsrf } from "csrf-csrf";

// 設定の読み込み (config.js または config.json から)
// ※既存のconfig.jsを利用する想定
import { users, port, brokenSites } from "./config.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicPath = join(__dirname, "public");
const version = "1.0.0-Hybrid";

const app = express();
const server = createServer();

// --- 1. AlloyProxy の設定 ---
const localprox = new alloy({
    prefix: '/prefix/',
    error: (proxy) => {
        return proxy.res.send('<h1>SenninProxy (Alloy) Error</h1><p>リクエストを処理できませんでした。</p>');
    },
    request: [],
    response: [],
    injection: true
});

// --- 2. ミドルウェアの設定 ---

// Basic Auth (設定がある場合のみ)
if (Object.keys(users).length > 0) {
    app.use(basicAuth({ users, challenge: true }));
}

// セッションとクッキー
app.use(cookieParser());
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "sennin-shadow-secret-混合-999",
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "strict" 
    }
}));

// --- 3. プロキシ・ルーティング ---

// AlloyProxy ミドルウェアの適用
app.use(localprox.app);
localprox.ws(server);

// 静的ファイル提供 (1 week cache)
app.use(express.static(publicPath, { maxAge: 604800000 }));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/uv/", express.static(uvPath));

// --- 4. API エンドポイント ---

// バージョン & 不具合サイト情報
app.get("/v1/api/version", (req, res) => res.status(200).send(version));
app.get("/v1/api/broken-sites", async (req, res) => res.status(200).send(await brokenSites()));

// 検索サジェスト
app.get("/v1/api/search-suggestions", async (req, res) => {
    const query = req.query.query;
    const engine = req.headers.engine ?? "google";
    try {
        if (engine === "google") {
            const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`).then(res => res.json());
            res.send(response);
        } else {
            res.send([]);
        }
    } catch (e) {
        res.status(500).send([]);
    }
});

// --- 5. AI チャット機能 & セキュリティ ---

const { generateToken, validateRequest } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || "csrf-secret-key-123",
    getTokenFromRequest: (req) => req.headers["x-csrf-token"]
});

app.get('/csrf-token', (req, res) => {
    req.session.hasSession = true;
    res.json({ csrfToken: generateToken(req, res) });
});

app.post('/ask', async (req, res) => {
    if (!req.session.hasSession) return res.status(401).json({ error: "No session" });
    const { messages, model } = req.body;
    try {
        const response = await fetch("https://api.shuttleai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SHUTTLEAI_API_KEY}`
            },
            body: JSON.stringify({ model: model || "shuttle-3.5", messages })
        });
        const data = await response.json();
        res.json({ message: data.choices.message.content });
    } catch (error) {
        res.status(500).json({ error: "AI communication failed" });
    }
});

// --- 6. メインルート (index.html) ---
app.get('/', (req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
});

// --- 7. プロトコル・アップグレード & サーバー起動 ---

// COOP ヘッダーの適用
server.on("request", (req, res) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    app(req, res);
});

// Wisp プロトコルの処理
server.on("upgrade", (req, socket, head) => {
    if (req.url.endsWith("/wisp/")) {
        wisp.routeRequest(req, socket, head);
    } else {
        socket.end();
    }
});

server.listen(port, () => {
    console.log(`\x1b[36m--- SenninProxy Hybrid System ---\x1b[0m`);
    console.log(`\x1b[32mRunning on port: ${port}\x1b[0m`);
    console.log(`\x1b[33mMode: Ultraviolet + Alloy + Wisp\x1b[0m`);
});
