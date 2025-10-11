"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Upload, X, Play, Pause } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"

interface Post {
  id: string
  caption: string
  media_url: string
  media_type: "photo" | "video"
  likes_count: number
  comments_count: number
  liked: boolean
  user: { email: string }
  created_at: string
}

interface Comment {
  id: string
  comment: string
  user: { email: string }
  created_at: string
}

export function SocialFeed({ competitionId }: { competitionId: string }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    loadPosts()
  }, [competitionId])

  const loadPosts = async () => {
    const res = await fetch(`/api/competitions/${competitionId}/posts`)
    const data = await res.json()
    setPosts(data.posts || [])
    setLoading(false)
  }

  const handleLike = async (postId: string, liked: boolean) => {
    const method = liked ? "DELETE" : "POST"
    await fetch(`/api/competitions/${competitionId}/posts/${postId}/like`, { method })

    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, liked: !liked, likes_count: post.likes_count + (liked ? -1 : 1) } : post,
      ),
    )
  }

  const loadComments = async (postId: string) => {
    const res = await fetch(`/api/competitions/${competitionId}/posts/${postId}/comments`)
    const data = await res.json()
    setComments(data.comments || [])
  }

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return

    const res = await fetch(`/api/competitions/${competitionId}/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: newComment }),
    })

    if (res.ok) {
      const data = await res.json()
      setComments([...comments, data.comment])
      setNewComment("")
      setPosts(posts.map((post) => (post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post)))
    }
  }

  const openComments = (post: Post) => {
    setSelectedPost(post)
    loadComments(post.id)
  }

  if (loading) {
    return <div className="text-center py-8">Loading feed...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Trip Highlights</h2>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Share Moment
        </Button>
      </div>

      {showUpload && (
        <UploadModal
          competitionId={competitionId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false)
            loadPosts()
          }}
        />
      )}

      {selectedPost && (
        <CommentsModal
          post={selectedPost}
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          onComment={handleComment}
          onClose={() => setSelectedPost(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <div className="relative aspect-[9/16] bg-muted">
              {post.media_type === "photo" ? (
                <img
                  src={post.media_url || "/placeholder.svg"}
                  alt={post.caption || "Golf moment"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <VideoPlayer src={post.media_url} />
              )}
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.liked)}
                  className={post.liked ? "text-red-500" : ""}
                >
                  <Heart className={`w-5 h-5 mr-1 ${post.liked ? "fill-current" : ""}`} />
                  {post.likes_count}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openComments(post)}>
                  <MessageCircle className="w-5 h-5 mr-1" />
                  {post.comments_count}
                </Button>
              </div>

              {post.caption && (
                <p className="text-sm">
                  <span className="font-semibold">{post.user.email.split("@")[0]}</span> {post.caption}
                </p>
              )}

              <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No moments shared yet. Be the first to share!</div>
      )}
    </div>
  )
}

function VideoPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setPlaying(!playing)
    }
  }

  return (
    <div className="relative w-full h-full group">
      <video ref={videoRef} src={src} className="w-full h-full object-cover" loop playsInline />
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {playing ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white" />}
      </button>
    </div>
  )
}

function UploadModal({ competitionId, onClose, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("caption", caption)
    formData.append("mediaType", file.type.startsWith("video/") ? "video" : "photo")

    const res = await fetch(`/api/competitions/${competitionId}/posts`, {
      method: "POST",
      body: formData,
    })

    if (res.ok) {
      onSuccess()
    }
    setUploading(false)
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

        {preview && (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {file?.type.startsWith("video/") ? (
              <video src={preview} controls className="w-full h-full object-cover" />
            ) : (
              <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
            )}
          </div>
        )}

        <Input type="file" accept="image/*,video/*" onChange={handleFileChange} />

        <Textarea
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
        />

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading} className="flex-1">
            {uploading ? "Uploading..." : "Share"}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function CommentsModal({ post, comments, newComment, setNewComment, onComment, onClose }: any) {
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
          {comments.map((comment: Comment) => (
            <div key={comment.id} className="space-y-1">
              <p className="text-sm">
                <span className="font-semibold">{comment.user.email.split("@")[0]}</span> {comment.comment}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))}
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
