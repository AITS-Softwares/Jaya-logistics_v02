export async function unsubscribeCurrentBrowserPush(token) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;

    if (token) {
      await fetch("/api/push/subscriptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        signal: AbortSignal.timeout(2000),
      });
    }
    await subscription.unsubscribe();
  } catch (error) {
    // Logout should still complete if the browser is offline or push is unavailable.
    console.warn("Could not remove this browser's push subscription:", error);
  }
}
