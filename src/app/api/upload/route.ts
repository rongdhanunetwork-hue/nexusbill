import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

    // If IMGBB API key exists, upload to ImgBB directly
    if (process.env.IMGBB_API_KEY) {
      const imgbbFormData = new FormData();
      // ImgBB requires base64 string
      const base64Image = buffer.toString("base64");
      imgbbFormData.append("image", base64Image);
      
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
        method: "POST",
        body: imgbbFormData,
      });
      const data = await res.json();
      
      if (data && data.success) {
        return NextResponse.json({ success: true, url: data.data.url });
      } else {
        throw new Error("ImgBB upload failed: " + (data.error?.message || "Unknown error"));
      }
    }

    // Fallback: Local Storage
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filepath = join(uploadDir, filename);

    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      const sharp = require("sharp");
      const resizedBuffer = await sharp(buffer)
        .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      await writeFile(filepath, resizedBuffer);
    } else {
      await writeFile(filepath, buffer);
    }
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
