"use server"

import { put } from "@vercel/blob"

export async function uploadFile(filename: string, fileData: string) {
  try {
    // Convert base64 to buffer
    const base64Data = fileData.split(",")[1]
    const buffer = Buffer.from(base64Data, "base64")

    const blob = await put(filename, buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return { success: true, url: blob.url }
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return { success: false, error: "Upload failed" }
  }
}
