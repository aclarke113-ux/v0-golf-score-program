"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Upload, X, Camera, ImageIcon } from "lucide-react"
import { createPost, getPostsByTournament, togglePostLike, createComment, getCommentsByPost } from "@/lib/supabase/db"
import { subscribeToPosts, unsubscribe } from "@/lib/supabase/realtime"
import type { Post } from "@/lib/types"

type SocialFeedProps = {
  currentUserId: string
  currentUserName: string
  tournamentId: string
}

export function SocialFeed({ currentUserId, currentUserName, tournamentId }: SocialFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPosts()

    const channel = subscribeToPosts(tournamentId, () => {
      loadPosts()
    })

    return () => {
      unsubscribe(channel)
    }
  }, [tournamentId])

  const loadPosts = async () => {
    try {
      const data = await getPostsByTournament(tournamentId)
      const postsWithComments = await Promise.all(
        data.map(async (post) => {
          const comments = await getCommentsByPost(post.id)
          return { ...post, comments }
        }),
      )
      setPosts(postsWithComments as Post[])
    } catch (error) {
      console.error("[v0] Error loading posts:", error)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      await togglePostLike(postId, currentUserId)
      await loadPosts()
    } catch (error) {
      console.error("[v0] Error toggling like:", error)
    }
  }

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return

    try {
      await createComment({
        postId,
        playerId: currentUserId,
        playerName: currentUserName,
        content: newComment.trim(),
      })

      setNewComment("")
      await loadPosts()

      if (selectedPost?.id === postId) {
        const comments = await getCommentsByPost(postId)
        setSelectedPost({
          ...selectedPost,
          comments,
        })
      }
    } catch (error) {
      console.error("[v0] Error creating comment:", error)
      alert("Failed to post comment. Please try again.")
    }
  }

  const handleUpload = async (caption: string, mediaUrl: string, mediaType: "image" | "video") => {
    setLoading(true)
    try {
      await createPost({
        tournamentId,
        userId: currentUserId,
        userName: currentUserName,
        caption,
        mediaUrl,
        mediaType,
      })

      setShowUpload(false)
      await loadPosts()
    } catch (error) {
      console.error("[v0] Error creating post:", error)
      alert("Failed to create post. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex-none flex justify-between items-center">
        <h2 className="text-2xl font-bold">Trip Highlights</h2>
        <Button onClick={() => setShowUpload(true)} disabled={loading}>
          <Upload className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}

      {selectedPost && (
        <CommentsModal
          post={selectedPost}
          newComment={newComment}
          setNewComment={setNewComment}
          onComment={handleComment}
          onClose={() => setSelectedPost(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {post.mediaUrl && (
                <div className="relative aspect-square bg-muted">
                  {post.mediaType === "video" ? (
                    <video src={post.mediaUrl} controls className="w-full h-full object-cover">
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img
                      src={post.mediaUrl || "/placeholder.svg"}
                      alt={post.caption || "Golf moment"}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={post.likedBy.includes(currentUserId) ? "text-red-500" : ""}
                  >
                    <Heart className={`w-5 h-5 mr-1 ${post.likedBy.includes(currentUserId) ? "fill-current" : ""}`} />
                    {post.likedBy.length}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPost(post)}>
                    <MessageCircle className="w-5 h-5 mr-1" />
                    {post.comments.length}
                  </Button>
                </div>

                <p className="text-sm">
                  <span className="font-semibold">{post.userName || "Unknown Player"}</span>
                  {post.caption && <> {post.caption}</>}
                </p>

                <p className="text-xs text-muted-foreground">{new Date(post.timestamp).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No moments shared yet. Be the first to share!</div>
        )}
      </div>
    </div>
  )
}

function UploadModal({
  onClose,
  onUpload,
}: { onClose: () => void; onUpload: (caption: string, mediaUrl: string, mediaType: "image" | "video") => void }) {
  const [caption, setCaption] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [uploading, setUploading] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<"camera" | "file" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success && result.url) {
        setMediaUrl(result.url)
        setMediaType(file.type.startsWith("video/") ? "video" : "image")
      } else {
        throw new Error(result.error || "Upload failed")
      }
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    if (!mediaUrl.trim()) return
    onUpload(caption, mediaUrl, mediaType)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Share a Moment</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!mediaUrl && !uploadMethod && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 bg-transparent"
              onClick={() => {
                setUploadMethod("camera")
                cameraInputRef.current?.click()
              }}
            >
              <Camera className="w-8 h-8" />
              <span>Take Photo/Video</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 bg-transparent"
              onClick={() => {
                setUploadMethod("file")
                fileInputRef.current?.click()
              }}
            >
              <ImageIcon className="w-8 h-8" />
              <span>Choose from Library</span>
            </Button>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
        />

        {uploading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        )}

        {mediaUrl && !uploading && (
          <>
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {mediaType === "video" ? (
                <video src={mediaUrl} controls className="w-full h-full object-cover">
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img src={mediaUrl || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
              )}
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setMediaUrl("")
                  setUploadMethod(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </>
        )}

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!mediaUrl.trim() || uploading} className="flex-1">
            Share
          </Button>
        </div>
      </Card>
    </div>
  )
}

function CommentsModal({
  post,
  newComment,
  setNewComment,
  onComment,
  onClose,
}: {
  post: Post
  newComment: string
  setNewComment: (value: string) => void
  onComment: (postId: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold">Comments</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {post.comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">{comment.userName}</span> {comment.content}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(comment.timestamp).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onComment(post.id)}
          />
          <Button onClick={() => onComment(post.id)}>Post</Button>
        </div>
      </Card>
    </div>
  )
}
