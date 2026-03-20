importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts("/uv/uv.client.js");
importScripts(__uv$config.sw || "/uv/uv.sw.js");

class SettingsManager {
    async get(key) { return null; }
}
class HistoryHelper {
    async setOpen(data) { console.log("History saved:", data); }
}

self.settings = new SettingsManager();
self.history = new HistoryHelper();

const uv = new UVServiceWorker();

uv.on("request", async (event) => {
  const ua = await self.settings.get("user-agent");
  if (ua) event.data.headers["user-agent"] = ua;
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.startsWith(location.origin + "/uv/service/")) {
    event.respondWith(uv.fetch(event));
  } else {
    event.respondWith(fetch(event.request));
  }
});
