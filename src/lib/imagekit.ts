// src/lib/imagekit.ts

/**
 * Supprime un fichier stocké sur ImageKit à partir de son URL publique
 */
export async function deleteFromImageKit(imageUrl: string | null | undefined): Promise<boolean> {
  if (!imageUrl || !imageUrl.startsWith("https://ik.imagekit.io/")) {
    return false;
  }

  try {
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    
    // Le premier élément de pathParts est l'identifiant ImageKit (ex: your_id)
    // Les éléments suivants forment le chemin réel du fichier
    if (pathParts.length < 2) return false;
    
    const filePath = "/" + pathParts.slice(1).join("/");
    console.log(`[ImageKit] Déclenchement de la suppression de : ${filePath}`);

    const imageKitPrivate = "private_v/s4IdMvOPXJfZx0b5rnUq4eyQg=";
    const authHeader = "Basic " + Buffer.from(imageKitPrivate + ":").toString("base64");

    const res = await fetch("https://api.imagekit.io/v1/files/batch/deleteByFilePaths", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify({
        filePaths: [filePath]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[ImageKit Delete Error details]:", errText);
      return false;
    }

    const data = await res.json();
    console.log("[ImageKit Delete Success]:", data);
    return true;
  } catch (error) {
    console.error("[ImageKit Delete Exception]:", error);
    return false;
  }
}
