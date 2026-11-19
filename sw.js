// Becoming Her Women's Collective: service worker.
//
// Its ONLY job is showing alerts. It deliberately has no "fetch" handler and caches nothing, so it
// can never serve an old copy of the app (we already learned how confusing a stale copy is).
//
// The server sends a small JSON message: { title, body, url, tag }. Alerts with the same `tag`
// replace each other, so a busy chat leaves one alert on the lock screen, not twenty.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Becoming Her Women's Collective";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/member" },
  };
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true; // a new message in the same chat still buzzes
  }
  // iPhone requires every push to show an alert, so we always do.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping an alert opens the app at the right page, reusing a window that's already open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/member", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch (e) {
              // fall through: focusing the window is still better than nothing
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
