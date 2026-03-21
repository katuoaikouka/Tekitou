import express from 'express';
import http from 'node:http';
import { createBareServer } from "@tomphttp/bare-server-node";
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Alloy from 'alloyproxy';

// ES Modules環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer();
const app = express();
const rootDir = process.cwd();
const bareServer = createBareServer('/bare/');

// SenninProxy (Alloy) の設定読み込み
const config = JSON.parse(fs.readFileSync('./config.json', { encoding: 'utf8' }));

// AlloyProxyのインスタンス化
const localprox = new Alloy({
    prefix: '/prefix/',
    error: (proxy) => {
        return proxy.res.send('<h1>SenninProxy Error</h1><p>リクエストを処理できませんでした。</p>');
    },
    request: [],
    response: [],
    injection: true
});

const PORT = process.env.PORT || config.port || 8080;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// AlloyProxy ミドルウェア
app.use(localprox.app);

// Ultraviolet用のルート設定を追加
app.get('/service/*', (req, res) => {
    res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// 静的ファイルの提供
app.use(express.static(path.join(rootDir, "public"), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('uv.sw.js')) {
            res.setHeader('Service-Worker-Allowed', '/');
        }
    }
}));

// メインルート
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

//検索API
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "missing q" });

  const query = encodeURIComponent(q);
  const url = `https://duckduckgo.com/?q=${query}`;

  try {
    // DuckDuckGoへの疎通確認
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (response.ok) {
      return res.json({ url });
    } else {
      return res.status(502).json({ error: "DuckDuckGo is temporarily unavailable" });
    }
  } catch (e) {
    return res.status(502).json({ error: "Failed to connect to search engine" });
  }
});

// AlloyProxyのWebSocket処理を登録
localprox.ws(server);

// HTTPサーバーのリクエストハンドリング統合
server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// WebSocket等のアップグレードハンドリング統合
server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    // AlloyProxy側のWSは localprox.ws(server) で内部的に処理されます
    socket.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server Listening on http://localhost:${PORT}`);
  console.log(`SenninProxy (Alloy) is running on /prefix/`);
});

// シャットダウン処理
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("Shutting down...");
  server.close(() => {
    bareServer.close();
    process.exit(0);
  });
}
