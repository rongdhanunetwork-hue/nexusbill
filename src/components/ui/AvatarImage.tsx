"use client";
import { useState, useRef, useEffect } from "react";

export default function AvatarImage({ src, fallbackText, className = "w-full h-full object-cover rounded-full" }: { src: string | null | undefined, fallbackText: string, className?: string }) {
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight === 0) {
        setError(true);
      }
    }
  }, [src]);

  if (error || !src) {
    return <span className="flex items-center justify-center w-full h-full">{fallbackText}</span>;
  }

  return (
    <img 
      ref={imgRef}
      src={src} 
      alt="" 
      className={className} 
      onError={() => setError(true)} 
    />
  );
}
