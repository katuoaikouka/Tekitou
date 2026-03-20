const express = require('express');
const alloy = require('alloyproxy');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

// 設定の読み込み
const config = JSON.parse(fs.readFileSync('./config.json', { encoding: 'utf8' }));

// AlloyProxyのインスタンス化
const localprox = new alloy({
    prefix: '/prefix/',
    error: (proxy) => {
        return proxy.res.send('<h1>SenninProxy Error</h1><p>リクエストを処理できませんでした。</p>');
    },
    request: [],
    response: [],
    injection: true
});

// プロキシミドルウェア
app.use(localprox.app);
localprox.ws(server);

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// メインルート
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動
const PORT = process.env.PORT || config.port;
server.listen(PORT, () => {
    console.log(`SenninProxy is running on http://localhost:${PORT}`);
});
