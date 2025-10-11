"use server"

import { put } from "@vercel/blob"

export async function uploadProfilePicture(formData: FormData) {
  try {
    const file = formData.get("file") as File

    if (!file) {
      return { error: "No file provided" }
    }

    // Upload to Vercel Blob
    const blob = await put(`profile-pictures/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    return { url: blob.url }
  } catch (error) {
    console.error("Error uploading profile picture:", error)
    return { error: "Failed to upload profile picture" }
  }
}
