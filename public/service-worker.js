self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() || "There is an update in Jaya Logistics ERP." };
  }

  const title = typeof data.title === "string" ? data.title : "Jaya Logistics ERP";
  const options = {
    body: typeof data.body === "string" ? data.body : "There is an update ready for you.",
    icon: "/aits_logo.png",
    badge: "/favicon.ico",
    data: { url: typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/admin" },
    tag: typeof data.tag === "string" ? data.tag : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = new URL(event.notification.data?.url || "/admin", self.location.origin);
  const targetUrl = candidate.origin === self.location.origin ? candidate.href : new URL("/admin", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
