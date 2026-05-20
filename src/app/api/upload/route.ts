// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imageKitPrivate = "private_v/s4IdMvOPXJfZx0b5rnUq4eyQg=";

    // Send file to ImageKit via standard Form Data
    const ikFormData = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    ikFormData.append("file", blob, file.name);
    
    // Clean and stamp filename
    const sanitizedName = `file-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    ikFormData.append("fileName", sanitizedName);

    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(imageKitPrivate + ":").toString("base64")
      },
      body: ikFormData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("ImageKit upload error details:", errText);
      return NextResponse.json({ error: "Erreur de chargement sur ImageKit" }, { status: 502 });
    }

    const ikData = await res.json();
    return NextResponse.json({ 
      success: true, 
      url: ikData.url // The direct ImageKit URL
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}
