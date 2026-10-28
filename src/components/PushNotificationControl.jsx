"use client";

import { useEffect, useState } from "react";

function supportsPush() {
  return typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
}

export default function PushNotificationControl() {
  const [state, setState] = useState("checking");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadState() {
      if (!supportsPush()) {
        if (mounted) setState("unsupported");
        return;
      }
      try {
        const response = await fetch("/api/push/public-key", { cache: "no-store" });
        const config = await response.json();
        if (!mounted) return;
        if (!config.enabled || !config.publicKey) {
          setState("unconfigured");
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager?.getSubscription();
        setState(subscription ? "enabled" : "disabled");
      } catch {
        if (mounted) setState("unsupported");
      }
    }
    loadState();
    return () => { mounted = false; };
  }, []);

  async function togglePush() {
    setBusy(true);
    setMessage("");
    try {
      if (state === "enabled") {
        const token = localStorage.getItem("token");
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setState("disabled");
        setMessage("Browser notifications are off.");
        return;
      }

      if (!supportsPush()) throw new Error("This browser or installed app does not support Web Push.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow notifications for this site in your browser settings, then try again.");

      const configResponse = await fetch("/api/push/public-key", { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok || !config.enabled || !config.publicKey) {
        throw new Error("Push notifications are not configured on the ERP server yet.");
      }

      const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(config.publicKey),
      });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sign in again before enabling browser notifications.");

      const saveResponse = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!saveResponse.ok) {
        await subscription.unsubscribe();
        throw new Error("The ERP could not save this device's notification subscription.");
      }
      setState("enabled");
      setMessage("Browser notifications are enabled on this device.");
    } catch (error) {
      setMessage(error.message || "Could not update browser notification settings.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = ["checking", "unsupported", "unconfigured"].includes(state);
  const label = state === "enabled" ? "Notifications on" : "Enable notifications";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={togglePush}
        disabled={disabled || busy}
        title={state === "unsupported" ? "This browser or app does not support Web Push, or the site is not on HTTPS." : state === "unconfigured" ? "Server VAPID keys are not configured yet." : label}
        className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Saving…" : state === "checking" ? "Notifications…" : label}
      </button>
      {message && <span role="status" className="max-w-56 text-right text-[10px] text-slate-300">{message}</span>}
    </div>
  );
}

function decodeVapidKey(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
