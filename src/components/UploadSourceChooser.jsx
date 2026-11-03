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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/60">
      <div className="flex items-center justify-between gap-3">
        <h2 id="upload-source-title" className="text-lg font-bold">Add attachment</h2>
        <button type="button" onClick={close} aria-label="Close upload chooser" className="rounded px-2 py-1 text-slate-600">×</button>
      </div>
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={chooseFile} className="rounded-lg bg-sky-50 px-3 py-2 font-semibold text-sky-800">Upload file</button>
        {mode === "choose" && <button type="button" onClick={() => openCamera()} className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">Take photo</button>}
      </div>
      {message && <p role="alert" className="mt-2 text-sm text-red-700">{message}</p>}
    </dialog>
  );
}
