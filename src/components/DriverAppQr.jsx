"use client";
import { useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { QrCode } from 'lucide-react';

export default function DriverAppQr() {
  const dialog = useRef(null);
  return <>
    <button type="button" className="signin-driver-qr-trigger" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><QrCode size={16} aria-hidden="true" />Driver App QR</button>
    <dialog ref={dialog} aria-labelledby="driver-app-qr-title" className="signin-driver-qr-dialog" onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
    }}>
      <button type="button" className="signin-driver-qr-close" aria-label="Close Driver App QR" onClick={() => dialog.current?.close()}><FiX size={18} /></button>
      <h2 id="driver-app-qr-title">Driver App</h2>
      <p>Scan to download Driver App</p>
      <a href="/downloads/jaya-driver.apk" download="jaya-driver.apk" aria-label="Download Driver App debug APK"><img src="/downloads/driver-app-qr.svg" width="224" height="224" alt="QR code to download the Jaya Driver Android app" /></a>
      <span>Android · Debug APK</span>
    </dialog>
  </>;
}
