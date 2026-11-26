self.addEventListener('push', function(event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: data.icon || '/images/hero/kerala_pickle.png',
                image: data.image || null,
                badge: data.badge || '/images/hero/kerala_pickle.png',
                data: {
                    url: data.url || '/'
                }
            };
            event.waitUntil(
                self.registration.showNotification(data.title || 'KRIPA Pickles', options)
            );
        } catch (e) {
            // Fallback for simple text payloads
            event.waitUntil(
                self.registration.showNotification('KRIPA Pickles', {
                    body: event.data.text(),
                    icon: '/images/hero/kerala_pickle.png'
                })
            );
        }
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
