self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {

    if (!event.data) {
        return;
    }

    const data = event.data.json();

    event.waitUntil(
        self.registration.showNotification(
            data.title || "AlphaMind AI",
            {
                body: data.body || "New trading signal",
                icon: "favicon.png",
                badge: "favicon.png",
                vibrate: [200, 100, 200],
                data: {
                    url: data.url || "/"
                }
            }
        )
    );
});

self.addEventListener("notificationclick", event => {

    event.notification.close();

    event.waitUntil(
        clients.openWindow(
            event.notification.data.url || "/"
        )
    );
});
