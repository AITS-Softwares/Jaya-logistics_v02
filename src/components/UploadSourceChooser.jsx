"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function photoFormat(input) {
  const accepts = input.accept.toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
  if (!accepts.length || accepts.some(value => ["*/*", "image/*", "image/jpeg", "image/jpg", ".jpeg", ".jpg"].includes(value))) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (accepts.includes("image/png") || accepts.includes(".png")) return { mime: "image/png", extension: "png" };
  if (accepts.includes("image/webp") || accepts.includes(".webp")) return { mime: "image/webp", extension: "webp" };
  return null;
}

export default function UploadSourceChooser() {
  const pathname = usePathname();
  const dialog = useRef(null);
  const video = useRef(null);
  const stream = useRef(null);
  const requestId = useRef(0);
  const nativeTarget = useRef(null);
  const [target, setTarget] = useState(null);
  const [mode, setMode] = useState("choose");
  const [facing, setFacing] = useState("environment");
  const [message, setMessage] = useState("");

  function stopCamera() {
    requestId.current += 1;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  }

  function close() {
    stopCamera();
    dialog.current?.close();
    setTarget(null);
  }

  useEffect(() => {
    function handleFileClick(event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || input.disabled
        || input === nativeTarget.current || input.hasAttribute("capture")
        || input.hasAttribute("data-native-upload") || !photoFormat(input)) return;
      event.preventDefault();
      event.stopPropagation();
      stopCamera();
      setTarget(input);
      setMode("choose");
      setMessage("");
      if (!dialog.current?.open) dialog.current?.showModal();
    }
    document.addEventListener("click", handleFileClick, true);
    return () => {
      document.removeEventListener("click", handleFileClick, true);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    stopCamera();
    dialog.current?.close();
    setTarget(null);
  }, [pathname]);

  function chooseFile() {
    if (!target?.isConnected || target.disabled) return close();
    nativeTarget.current = target;
    close();
    try {
      target.click();
    } finally {
      nativeTarget.current = null;
    }
  }

  function deliverPhoto(input, file) {
    if (!input?.isConnected || input.disabled) return close();
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    } catch {
      setMessage("This browser could not attach the photo. Save it on your device and use Upload file.");
      setMode("choose");
      stopCamera();
      return;
    }
    close();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function openCamera(nextFacing = "environment", switching = false) {
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode("native");
      return;
    }
    const id = requestId.current;
    setMode("opening");
    setMessage("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: switching ? { exact: nextFacing } : { ideal: nextFacing } },
      });
      if (requestId.current !== id) {
        media.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = media;
      setFacing(media.getVideoTracks()[0]?.getSettings().facingMode || nextFacing);
      setMode("camera");
    } catch {
      if (requestId.current === id) setMode("native");
    }
  }

  useEffect(() => {
    if (mode === "camera" && video.current) video.current.srcObject = stream.current;
  }, [mode, facing]);

  function capturePhoto() {
    const preview = video.current;
    if (!target || !preview?.videoWidth) {
      setMessage("Wait for the camera preview, then try again.");
      return;
    }
    const id = requestId.current;
    const format = photoFormat(target);
    if (!format) return;
    const canvas = document.createElement("canvas");
    canvas.width = preview.videoWidth;
    canvas.height = preview.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(preview, 0, 0);
    canvas.toBlob(blob => {
      if (requestId.current !== id) return;
      if (!blob || blob.type !== format.mime) {
        setMessage("Could not capture a photo in the required format. Use Upload file.");
        return;
      }
      deliverPhoto(target, new File([blob], `photo-${Date.now()}.${format.extension}`, { type: blob.type }));
    }, format.mime, 0.9);
  }

  function nativeCamera(nextFacing) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", nextFacing);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !target) return;
      const format = photoFormat(target);
      const allowed = target.accept.toLowerCase().split(",").map(value => value.trim());
      const fileName = file.name.toLowerCase();
      if (format && (!target.accept || allowed.includes("image/*") || allowed.includes("*/*")
        || allowed.includes(file.type) || allowed.some(value => value.startsWith(".") && fileName.endsWith(value)))) {
        deliverPhoto(target, file);
      } else {
        setMessage("The camera returned a file type this field cannot accept. Use Upload file.");
      }
    };
    input.click();
  }

  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="upload-source-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8" /></svg>
          </span>
          <div><h2 id="upload-source-title" className="text-lg font-bold tracking-tight">Add attachment</h2><p className="mt-1 text-sm text-slate-500">Choose a file or take a photo.</p></div>
        </div>
        <button type="button" onClick={close} aria-label="Close upload chooser" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="px-6 py-5">
      {mode === "opening" && <p role="status" className="mt-3 text-sm">Opening camera…</p>}
      {mode === "camera" && (
        <div className="mt-3">
          <video ref={video} autoPlay playsInline muted className="max-h-[55vh] w-full rounded-lg bg-black" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={capturePhoto} className="rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white">Take photo</button>
            <button type="button" onClick={() => openCamera(facing === "environment" ? "user" : "environment", true)} className="rounded-lg border px-3 py-2">Switch to {facing === "environment" ? "front" : "back"} camera</button>
          </div>
        </div>
      )}
      {mode === "native" && (
        <div className="mt-3">
          <p className="text-sm text-slate-600">Live preview is unavailable. You can try your device camera.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => nativeCamera("environment")} className="rounded-lg border px-3 py-2">Use back camera</button>
            <button type="button" onClick={() => nativeCamera("user")} className="rounded-lg border px-3 py-2">Use front camera</button>
          </div>
        </div>
      )}
      <div className={`grid gap-3 ${mode === "choose" ? "sm:grid-cols-2" : "mt-4"}`}>
        <button type="button" onClick={chooseFile} className="group flex min-h-32 flex-col items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m-4 4 4-4 4 4M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg></span>
          <span><span className="block text-sm font-semibold text-slate-900">Upload file</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">Browse files on your device</span></span>
        </button>
        {mode === "choose" && <button type="button" onClick={() => openCamera()} className="group flex min-h-32 flex-col items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6l1.5-2h5L16 6h4v14H4V6h4Z" /><circle cx="12" cy="12" r="3.5" /></svg></span>
          <span><span className="block text-sm font-semibold text-slate-900">Take photo</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">Use your device camera</span></span>
        </button>}
      </div>
      {message && <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
      </div>
      <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-3"><button type="button" onClick={close} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Cancel</button></div>
    </dialog>
  );
}
