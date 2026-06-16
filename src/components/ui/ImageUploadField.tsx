"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle2, X } from "lucide-react";

export default function ImageUploadField({ label, name, defaultValue, onChange }: { label: string; name: string; defaultValue?: string; onChange?: (val: string) => void }) {
  const [value, setValue] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    // Client-side image resize
    let finalFile = file;
    if (file.type.startsWith("image/")) {
      try {
        finalFile = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;
            let width = img.width;
            let height = img.height;

            // Crop to square
            const minDim = Math.min(width, height);
            canvas.width = MAX_WIDTH;
            canvas.height = MAX_HEIGHT;
            const ctx = canvas.getContext("2d");
            
            if (ctx) {
              const startX = (width - minDim) / 2;
              const startY = (height - minDim) / 2;
              ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_WIDTH, MAX_HEIGHT);
              
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(new File([blob], file.name, { type: "image/jpeg" }));
                } else {
                  resolve(file);
                }
              }, "image/jpeg", 0.85);
            } else {
              resolve(file);
            }
          };
          img.onerror = () => resolve(file);
          img.src = URL.createObjectURL(file);
        });
      } catch (err) {
        console.warn("Client side resize failed", err);
      }
    }

    const formData = new FormData();
    formData.append("file", finalFile);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setValue(data.url);
        if (onChange) onChange(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setValue("");
    if (onChange) onChange("");
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex flex-col gap-3">
        <input type="hidden" name={name} value={value} />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${name}`}
        />
        <label
          htmlFor={`file-upload-${name}`}
          className={`w-fit px-5 py-2.5 rounded-xl border text-sm font-bold cursor-pointer flex items-center gap-2 transition-all ${
            value 
              ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
          }`}
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin text-neon-blue" />
          ) : value ? (
            <CheckCircle2 size={18} />
          ) : (
            <Upload size={18} />
          )}
          {uploading ? "Uploading..." : value ? "Image Uploaded Successfully" : "Select Image"}
        </label>
        
        
        <p className="text-[10px] text-gray-500 font-medium">Images are automatically resized and cropped to a perfect square (500x500px).</p>
        
        {value && (
          <div className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-xl w-full max-w-sm">
            <div className="flex items-center gap-3">
              <img src={value} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> Ready</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{value.split("/").pop()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
              title="Remove Image"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
