"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

interface ArticleData {
  title: string;
  subtitle: string;
  excerpt: string;
  description: string;
  body: string;
  imageUrl: string | null;
  source: string;
}

interface PublishResult {
  platform: string;
  status: string;
  id?: string;
  reason?: string;
}

interface HistoryEntry {
  article_url: string;
  article_title: string | null;
  image_url: string | null;
  platforms: PublishResult[];
  published_at: string;
}

interface DraftEntry {
  id: number;
  article_url: string | null;
  article_title: string | null;
  image_url: string | null;
  posts: Record<string, string>;
  mode: string;
  freeform_text: string | null;
  created_at: string;
}

interface ScheduledEntry {
  id: number;
  article_url: string | null;
  article_title: string | null;
  platforms: string[];
  scheduled_at: string;
  status: string;
  publish_results: PublishResult[] | null;
  created_at: string;
}

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "IG", color: "#E1306C", charLimit: null },
  { key: "facebook", label: "Facebook", icon: "f", color: "#1877F2", charLimit: null },
  { key: "twitter", label: "X", icon: "\ud835\udd4f", color: "#000000", charLimit: 280 },
  { key: "bluesky", label: "Bluesky", icon: "\ud83e\udd8b", color: "#0085FF", charLimit: 300 },
  { key: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2", charLimit: null },
];

const ALL_PLATFORM_KEYS = PLATFORMS.map(p => p.key);

export default function Home() {
  const router = useRouter();
  const freeformRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"article" | "freeform">("article");
  const [url, setUrl] = useState("");
  const [freeformText, setFreeformText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [posts, setPosts] = useState<Record<string, string> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [platformImages, setPlatformImages] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/check").then(r => r.json()).then(d => {
      if (!d.authenticated) router.push("/login");
    });
  }, [router]);

  const loadHistory = useCallback(() => {
    fetch("/api/history").then(r => r.json()).then(setHistory).catch(() => {});
  }, []);
  const loadDrafts = useCallback(() => {
    fetch("/api/drafts").then(r => r.json()).then(setDrafts).catch(() => {});
  }, []);
  const loadScheduled = useCallback(() => {
    fetch("/api/scheduled").then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setScheduledPosts(data);
    }).catch(() => {});
  }, []);
  useEffect(() => { loadHistory(); loadDrafts(); loadScheduled(); }, [loadHistory, loadDrafts, loadScheduled]);

  function resetState() {
    setArticle(null);
    setPosts(null);
    setPublishResults(null);
    setSelectedPlatforms([]);
    setEditingPost(null);
    setCustomImageUrl(null);
    setPlatformImages({});
    setShowEmojiPicker(false);
    setShowScheduler(false);
    setScheduledTime("");
    setError("");
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    const emoji = emojiData.emoji;
    const textarea = freeformRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = freeformText.slice(0, start) + emoji + freeformText.slice(end);
      setFreeformText(newText);
      // Restore cursor position after the inserted emoji
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + emoji.length;
        textarea.setSelectionRange(pos, pos);
      });
    } else {
      setFreeformText(prev => prev + emoji);
    }
  }

  // The effective image URL: custom upload overrides article image
  const effectiveImageUrl = customImageUrl || article?.imageUrl || null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Accepted: JPG, PNG, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to upload image');
        return;
      }
      const { url } = await res.json();
      setCustomImageUrl(url);
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected
      e.target.value = '';
    }
  }

  function handleRemoveImage() {
    // Clean up the blob in the background (best effort)
    if (customImageUrl) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: customImageUrl }),
      }).catch(() => {});
    }
    setCustomImageUrl(null);
  }

  // Upload a different image for a specific platform
  async function handlePlatformImageUpload(platform: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Accepted: JPG, PNG, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadingPlatform(platform);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to upload image');
        return;
      }
      const { url } = await res.json();
      setPlatformImages(prev => ({ ...prev, [platform]: url }));
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingPlatform(null);
      e.target.value = '';
    }
  }

  function handleRemovePlatformImage(platform: string) {
    const url = platformImages[platform];
    if (url) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }).catch(() => {});
    }
    setPlatformImages(prev => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  }

  // Get the image URL for a specific platform (platform override > shared custom > article)
  function getImageForPlatform(platform: string): string | null {
    return platformImages[platform] || effectiveImageUrl;
  }

  async function handleFetchUrl() {
    if (!url.trim()) return;
    setFetching(true);
    resetState();
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch URL");
        return;
      }
      setArticle(await res.json());
    } catch {
      setError("Failed to fetch URL");
    } finally {
      setFetching(false);
    }
  }

  async function handleGenerate() {
    const title = mode === "article" ? article?.title : "";
    const body = mode === "article" ? article?.body : freeformText;
    const articleUrl = mode === "article" ? url.trim() : "";
    const subtitle = mode === "article" ? article?.subtitle : "";
    const excerpt = mode === "article" ? article?.excerpt : "";

    if (!title && !body) return;

    setGenerating(true);
    setError("");
    setPosts(null);
    setPublishResults(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "", body: body || "", url: articleUrl, subtitle: subtitle || "", excerpt: excerpt || "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate posts");
        return;
      }
      setPosts(await res.json());
    } catch {
      setError("Failed to generate posts");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegeneratePlatform(platform: string) {
    setRegeneratingPlatform(platform);
    try {
      const title = mode === "article" ? article?.title : "";
      const body = mode === "article" ? article?.body : freeformText;
      const articleUrl = mode === "article" ? url.trim() : "";
      const subtitle = mode === "article" ? article?.subtitle : "";
      const excerpt = mode === "article" ? article?.excerpt : "";

      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, title: title || "", body: body || "", url: articleUrl, subtitle: subtitle || "", excerpt: excerpt || "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to regenerate");
        return;
      }
      const { text } = await res.json();
      if (posts) {
        setPosts({ ...posts, [platform]: text });
      }
    } catch {
      setError("Failed to regenerate post");
    } finally {
      setRegeneratingPlatform(null);
    }
  }

  async function handlePublish() {
    if (!posts || !selectedPlatforms.length) return;
    setPublishing(true);
    setPublishResults(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts,
          platforms: selectedPlatforms,
          imageUrl: effectiveImageUrl,
          platformImages,
          articleUrl: url.trim(),
          articleTitle: article?.title || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish");
        return;
      }
      setPublishResults(data.results || []);
      loadHistory();
    } catch {
      setError("Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (!posts || !selectedPlatforms.length || !scheduledTime) return;
    setScheduling(true);
    setError("");
    try {
      // Convert the local datetime-local value to an ISO string
      // The input is in the user's local time; we send as-is and let the server store it
      const scheduledAt = new Date(scheduledTime).toISOString();

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts,
          platforms: selectedPlatforms,
          imageUrl: effectiveImageUrl,
          platformImages,
          articleUrl: url.trim(),
          articleTitle: article?.title || null,
          scheduledAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to schedule");
        return;
      }
      setShowScheduler(false);
      setScheduledTime("");
      loadScheduled();
    } catch {
      setError("Failed to schedule post");
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelScheduled(id: number) {
    try {
      const res = await fetch(`/api/scheduled?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to cancel");
        return;
      }
      loadScheduled();
    } catch {
      setError("Failed to cancel scheduled post");
    }
  }

  function updatePost(key: string, value: string) {
    if (!posts) return;
    setPosts({ ...posts, [key]: value });
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSaveDraft() {
    if (!posts) return;
    setSavingDraft(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl: url.trim() || null,
          articleTitle: article?.title || null,
          articleBody: article?.body || null,
          imageUrl: effectiveImageUrl,
          posts,
          mode,
          freeformText: freeformText || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save draft");
        return;
      }
      loadDrafts();
    } catch {
      setError("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  function loadDraft(draft: DraftEntry) {
    setMode(draft.mode as "article" | "freeform");
    setUrl(draft.article_url || "");
    setFreeformText(draft.freeform_text || "");
    // If the draft has a Vercel Blob image, restore it as a custom image
    // Otherwise treat it as the article's original image
    if (draft.image_url && draft.image_url.includes('blob.vercel-storage.com')) {
      setCustomImageUrl(draft.image_url);
      if (draft.article_title) {
        setArticle({ title: draft.article_title, subtitle: "", excerpt: "", description: "", body: "", imageUrl: null, source: "draft" });
      }
    } else {
      setCustomImageUrl(null);
      if (draft.article_title) {
        setArticle({ title: draft.article_title, subtitle: "", excerpt: "", description: "", body: "", imageUrl: draft.image_url, source: "draft" });
      }
    }
    setPosts(draft.posts);
    setPublishResults(null);
    setSelectedPlatforms([]);
  }

  async function handleDeleteDraft(id: number) {
    try {
      await fetch(`/api/drafts?id=${id}`, { method: "DELETE" });
      loadDrafts();
    } catch {
      setError("Failed to delete draft");
    }
  }

  function toggleSelectAll() {
    if (selectedPlatforms.length === ALL_PLATFORM_KEYS.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms([...ALL_PLATFORM_KEYS]);
    }
  }

  const allSelected = posts && selectedPlatforms.length === ALL_PLATFORM_KEYS.length;
  const imageUrl = effectiveImageUrl;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#111111" }}>Social Publisher</h1>
        <p className="text-sm" style={{ color: "#515151" }}>Generate and publish social media posts across all platforms.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg mb-6 text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {error}
          <button onClick={() => setError("")} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg inline-flex" style={{ background: "#F0F0F0" }}>
        <button
          onClick={() => { setMode("article"); resetState(); setFreeformText(""); }}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: mode === "article" ? "#FFFFFF" : "transparent", color: mode === "article" ? "#111111" : "#515151", boxShadow: mode === "article" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
          From Article
        </button>
        <button
          onClick={() => { setMode("freeform"); resetState(); setUrl(""); }}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: mode === "freeform" ? "#FFFFFF" : "transparent", color: mode === "freeform" ? "#111111" : "#515151", boxShadow: mode === "freeform" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
          Create Post
        </button>
      </div>

      {/* Article Mode: URL Input */}
      {mode === "article" && (
        <div className="flex gap-3 mb-8">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetchUrl(); } }}
            placeholder="https://planetdetroit.org/2026/03/your-article..."
            className="flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{ border: "1px solid #CCCCCC", fontFamily: "Georgia, garamond, 'Times New Roman', serif" }}
            autoFocus
          />
          <button
            onClick={handleFetchUrl}
            disabled={fetching || !url.trim()}
            className="px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
            style={{ background: "#2982C4" }}
            onMouseEnter={(e) => { if (!fetching) e.currentTarget.style.background = "#1e6da3"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#2982C4"; }}>
            {fetching ? "Fetching..." : "Fetch Article"}
          </button>
        </div>
      )}

      {/* Freeform Mode: Text Input */}
      {mode === "freeform" && (
        <div className="mb-8">
          <div className="relative">
            <textarea
              ref={freeformRef}
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              placeholder="Write your post content here... Claude will adapt it for each platform."
              rows={5}
              className="w-full px-4 py-3 pb-12 rounded-lg text-sm focus:outline-none focus:ring-2 resize-y"
              style={{ border: "1px solid #CCCCCC", fontFamily: "Georgia, garamond, 'Times New Roman', serif" }}
              autoFocus
            />
            {/* Toolbar inside textarea */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 rounded flex items-center justify-center text-lg transition-colors"
                style={{ background: showEmojiPicker ? "#e5e5e5" : "transparent", color: "#515151" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = showEmojiPicker ? "#e5e5e5" : "transparent"; }}
                title="Add emoji">
                😀
              </button>
              <span className="text-xs" style={{ color: "#999" }}>{freeformText.length} chars</span>
            </div>
          </div>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div className="relative mb-3">
              <div className="absolute z-10 mt-1">
                <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
              </div>
              {/* Click-away backdrop */}
              <div className="fixed inset-0 z-[9]" onClick={() => setShowEmojiPicker(false)} />
            </div>
          )}

          {!showEmojiPicker && <div className="mb-3" />}

          {/* Image upload for freeform mode */}
          <div className="flex items-center gap-3 mb-3">
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-20 h-14 object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <label className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
              style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
              {uploading ? "Uploading..." : imageUrl ? "Change Image" : "Add Image (optional)"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handleImageUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              <button onClick={handleRemoveImage}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#999" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#DD3333"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}>
                Remove
              </button>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !freeformText.trim()}
            className="px-6 py-2.5 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-semibold"
            style={{ background: "#EA5A39" }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = "#d44a2b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#EA5A39"; }}>
            {generating ? "Generating Posts..." : "Generate Social Posts"}
          </button>
        </div>
      )}

      {/* Article Preview (article mode only) */}
      {mode === "article" && article && (
        <div className="rounded-lg p-5 mb-8" style={{ background: "#FFFFFF", border: "1px solid #CCCCCC" }}>
          <div className="flex gap-5">
            {imageUrl && (
              <div className="flex-shrink-0 relative group">
                <img src={imageUrl} alt="" className="w-44 h-32 object-cover rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1" style={{ color: "#111111" }}>{article.title}</h2>
              {article.subtitle && (
                <p className="text-sm font-medium mb-1" style={{ color: "#2982C4", fontFamily: "Georgia, garamond, 'Times New Roman', serif" }}>
                  {article.subtitle}
                </p>
              )}
              <p className="text-sm line-clamp-3" style={{ color: "#515151", fontFamily: "Georgia, garamond, 'Times New Roman', serif" }}>
                {article.excerpt || article.description}
              </p>
              <p className="text-xs mt-2" style={{ color: "#999" }}>
                Source: {article.source === "wordpress" ? "Planet Detroit (WordPress API)" : "Open Graph"}
                {article.source === "wordpress" && (article.subtitle || article.excerpt) && " · Posts based on subtitle & summary"}
              </p>
            </div>
          </div>

          {/* Image Controls */}
          <div className="flex items-center gap-2 mt-4">
            <label className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors"
              style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
              {uploading ? "Uploading..." : imageUrl ? "Change Image" : "Add Image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handleImageUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              <button onClick={handleRemoveImage}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#999" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#DD3333"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}>
                Remove Image
              </button>
            )}
            {customImageUrl && (
              <span className="text-xs" style={{ color: "#2982C4" }}>Custom image uploaded</span>
            )}
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="mt-4 px-6 py-2.5 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-semibold"
            style={{ background: "#EA5A39" }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = "#d44a2b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#EA5A39"; }}>
            {generating ? "Generating Posts..." : "Generate Social Posts"}
          </button>
        </div>
      )}

      {/* Post Preview Cards */}
      {posts && (
        <>
          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium" style={{ color: "#515151" }}>
              <input
                type="checkbox"
                checked={!!allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-[#2982C4]"
              />
              {allSelected ? "Deselect All" : "Select All Platforms"}
            </label>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
              style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
              {generating ? "Regenerating..." : "Regenerate All"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {PLATFORMS.filter(({ key }) => posts[key]).map(({ key, label, icon, color, charLimit }) => {
              const isSelected = selectedPlatforms.includes(key);
              const charCount = (posts[key] || "").length;
              const overLimit = charLimit ? charCount > charLimit : false;
              const isRegenerating = regeneratingPlatform === key;
              const cardImageUrl = getImageForPlatform(key);
              const hasCustomPlatformImage = !!platformImages[key];
              const isUploadingThis = uploadingPlatform === key;

              return (
                <div key={key} className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: "#FFFFFF",
                    border: `2px solid ${isSelected ? color : "#CCCCCC"}`,
                    boxShadow: isSelected ? "0 4px 16px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                  }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#F0F0F0", borderBottom: "1px solid #CCCCCC" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: color }}>{icon}</span>
                      <span className="font-semibold text-sm" style={{ color: "#111111" }}>{label}</span>
                      {charLimit && (
                        <span className="text-xs ml-2 font-medium" style={{ color: overLimit ? "#DD3333" : "#999" }}>
                          {charCount}/{charLimit}
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium" style={{ color: "#515151" }}>
                      <input type="checkbox" checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPlatforms(prev => [...prev, key]);
                          else setSelectedPlatforms(prev => prev.filter(p => p !== key));
                        }} className="w-3.5 h-3.5 accent-[#2982C4]" />
                      Publish
                    </label>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: color }}>PD</div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#111111" }}>Planet Detroit</div>
                        <div className="text-xs" style={{ color: "#515151" }}>
                          {key === "twitter" ? "@PlanetDetroit" :
                           key === "bluesky" ? "@planetdetroit.org" :
                           key === "instagram" ? "@planetdetroitnews" : "Planet Detroit"}
                        </div>
                      </div>
                    </div>

                    {cardImageUrl && (
                      <div className="rounded-lg overflow-hidden mb-3 relative group" style={{ background: "#F0F0F0" }}>
                        <img src={cardImageUrl} alt="" className="w-full h-44 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        {/* Per-platform image controls overlay */}
                        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                          <label className="px-2 py-1 rounded text-xs font-medium cursor-pointer"
                            style={{ background: "rgba(255,255,255,0.9)", color: "#333" }}>
                            {isUploadingThis ? "..." : "Swap"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                              onChange={(e) => handlePlatformImageUpload(key, e)} disabled={isUploadingThis} />
                          </label>
                          {hasCustomPlatformImage && (
                            <button onClick={() => handleRemovePlatformImage(key)}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ background: "rgba(255,255,255,0.9)", color: "#DD3333" }}>
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {!cardImageUrl && (
                      <label className="rounded-lg mb-3 flex items-center justify-center cursor-pointer transition-colors h-20"
                        style={{ background: "#F0F0F0", border: "1px dashed #CCCCCC" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#F0F0F0"; }}>
                        <span className="text-xs font-medium" style={{ color: "#999" }}>
                          {isUploadingThis ? "Uploading..." : "+ Add Image"}
                        </span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(e) => handlePlatformImageUpload(key, e)} disabled={isUploadingThis} />
                      </label>
                    )}

                    {isRegenerating ? (
                      <div className="text-sm py-4 text-center" style={{ color: "#999" }}>Regenerating...</div>
                    ) : editingPost === key ? (
                      <textarea value={posts[key]} onChange={(e) => updatePost(key, e.target.value)}
                        rows={Math.max(4, (posts[key] || "").split("\n").length + 1)}
                        className="w-full text-sm leading-relaxed p-2.5 rounded-md focus:outline-none focus:ring-2 resize-y"
                        style={{ border: "1px solid #2982C4", fontFamily: "Georgia, garamond, 'Times New Roman', serif", color: "#111111" }}
                        autoFocus onBlur={() => setEditingPost(null)} />
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words cursor-text rounded-md p-2 transition-colors"
                        style={{ color: "#111111", fontFamily: "Georgia, garamond, 'Times New Roman', serif" }}
                        onClick={() => setEditingPost(key)} title="Click to edit"
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F0F0F0"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        {posts[key]}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 px-4 py-2.5" style={{ background: "#F0F0F0", borderTop: "1px solid #CCCCCC" }}>
                    <button onClick={() => setEditingPost(editingPost === key ? null : key)}
                      className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                      style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                      {editingPost === key ? "Done" : "Edit"}
                    </button>
                    <button onClick={() => handleRegeneratePlatform(key)}
                      disabled={isRegenerating}
                      className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                      style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: isRegenerating ? "#999" : "#2982C4" }}
                      onMouseEnter={(e) => { if (!isRegenerating) e.currentTarget.style.background = "#e5e5e5"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                      {isRegenerating ? "..." : "Regenerate"}
                    </button>
                    <button onClick={() => copyToClipboard(posts[key], key)}
                      className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                      style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                      {copiedField === key ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-4">
            {selectedPlatforms.length > 0 && (
              <>
                <button onClick={handlePublish} disabled={publishing}
                  className="px-8 py-3 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-semibold"
                  style={{ background: "#EA5A39" }}
                  onMouseEnter={(e) => { if (!publishing) e.currentTarget.style.background = "#d44a2b"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#EA5A39"; }}>
                  {publishing ? "Publishing..." : `Publish Now to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
                </button>
                <button onClick={() => setShowScheduler(!showScheduler)}
                  className="px-6 py-3 rounded-lg transition-colors text-sm font-semibold"
                  style={{
                    background: showScheduler ? "#2982C4" : "#FFFFFF",
                    border: "1px solid #2982C4",
                    color: showScheduler ? "#FFFFFF" : "#2982C4",
                  }}
                  onMouseEnter={(e) => { if (!showScheduler) e.currentTarget.style.background = "#eef6fc"; }}
                  onMouseLeave={(e) => { if (!showScheduler) e.currentTarget.style.background = "#FFFFFF"; }}>
                  Schedule
                </button>
              </>
            )}
            <button onClick={handleSaveDraft} disabled={savingDraft}
              className="px-6 py-3 rounded-lg disabled:opacity-50 transition-colors text-sm font-semibold"
              style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#515151" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e5e5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>
            {publishing && <span className="text-sm" style={{ color: "#515151" }}>This may take a moment...</span>}
          </div>

          {/* Schedule Picker */}
          {showScheduler && selectedPlatforms.length > 0 && (
            <div className="rounded-lg p-4 mb-8" style={{ background: "#eef6fc", border: "1px solid #2982C4" }}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#111111" }}>
                    Schedule for (your local time)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="px-3 py-2.5 rounded-lg text-sm w-full focus:outline-none focus:ring-2"
                    style={{ border: "1px solid #CCCCCC", background: "#FFFFFF" }}
                  />
                </div>
                <button
                  onClick={handleSchedule}
                  disabled={scheduling || !scheduledTime}
                  className="px-6 py-2.5 text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-semibold whitespace-nowrap"
                  style={{ background: "#2982C4" }}
                  onMouseEnter={(e) => { if (!scheduling) e.currentTarget.style.background = "#1e6da3"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2982C4"; }}>
                  {scheduling ? "Scheduling..." : `Schedule ${selectedPlatforms.length} Post${selectedPlatforms.length !== 1 ? "s" : ""}`}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "#515151" }}>
                Posts will be published automatically at the scheduled time.
              </p>
            </div>
          )}

          {/* Results */}
          {publishResults && (
            <div className="mb-8 space-y-1.5">
              {publishResults.map((r, i) => (
                <div key={i} className="px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    background: r.status === "published" ? "#ecfdf5" : r.status === "skipped" ? "#fffbeb" : "#fef2f2",
                    color: r.status === "published" ? "#065f46" : r.status === "skipped" ? "#92400e" : "#991b1b",
                    border: `1px solid ${r.status === "published" ? "#a7f3d0" : r.status === "skipped" ? "#fde68a" : "#fecaca"}`,
                  }}>
                  <strong>{r.platform}</strong>: {r.status === "published" ? "Published!" : r.status}
                  {r.reason ? ` \u2014 ${r.reason}` : ""}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div className="mt-12 pt-8" style={{ borderTop: "2px solid #2982C4" }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: "#111111" }}>Scheduled Posts</h2>
          <p className="text-xs mb-4" style={{ color: "#999" }}>Posts queued for automatic publishing</p>
          <div className="space-y-2">
            {scheduledPosts.map((sp) => {
              const isUpcoming = sp.status === "scheduled";
              const isFailed = sp.status === "failed";
              return (
                <div key={sp.id} className="rounded-lg px-4 py-3 flex items-center gap-4"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${isFailed ? "#fecaca" : isUpcoming ? "#2982C4" : "#CCCCCC"}`,
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                      {sp.article_title || "Freeform post"}
                    </div>
                    <div className="text-xs mt-1" style={{ color: isUpcoming ? "#2982C4" : isFailed ? "#DD3333" : "#999" }}>
                      {isUpcoming ? "Scheduled for " : isFailed ? "Failed — " : "Published "}
                      {new Date(sp.scheduled_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {(sp.platforms as string[]).map((p) => {
                        const platform = PLATFORMS.find(pl => pl.key === p);
                        return platform ? (
                          <span key={p} className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: platform.color, opacity: isUpcoming ? 1 : 0.5 }}>{platform.icon}</span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isUpcoming && (
                      <button onClick={() => handleCancelScheduled(sp.id)}
                        className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                        style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#999" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#DD3333"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}>
                        Cancel
                      </button>
                    )}
                    {sp.status === "published" && (
                      <span className="text-xs px-3 py-1.5 rounded font-medium"
                        style={{ background: "#ecfdf5", color: "#065f46" }}>
                        Published
                      </span>
                    )}
                    {isFailed && (
                      <span className="text-xs px-3 py-1.5 rounded font-medium"
                        style={{ background: "#fef2f2", color: "#991b1b" }}>
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="mt-12 pt-8" style={{ borderTop: "2px solid #2982C4" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#111111" }}>Saved Drafts</h2>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-lg px-4 py-3 flex items-center gap-4"
                style={{ background: "#FFFFFF", border: "1px solid #CCCCCC" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                    {draft.article_title || draft.freeform_text?.substring(0, 80) || "Untitled draft"}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#999" }}>
                    {new Date(draft.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {" \u2014 "}{Object.keys(draft.posts).length} platforms
                  </div>
                </div>
                <button onClick={() => loadDraft(draft)}
                  className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                  style={{ background: "#2982C4", color: "#FFFFFF" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1e6da3"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2982C4"; }}>
                  Load
                </button>
                <button onClick={() => handleDeleteDraft(draft.id)}
                  className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
                  style={{ background: "#FFFFFF", border: "1px solid #CCCCCC", color: "#999" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#DD3333"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-12 pt-8" style={{ borderTop: "2px solid #2982C4" }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: "#111111" }}>Recent Posts</h2>
          <p className="text-xs mb-4" style={{ color: "#999" }}>Last 20 published posts</p>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div key={i} className="rounded-lg px-4 py-3 flex items-center gap-4"
                style={{ background: "#FFFFFF", border: "1px solid #CCCCCC" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                    {entry.article_title || entry.article_url || "Post"}
                  </div>
                  {entry.article_url && (
                    <a href={entry.article_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs hover:underline truncate block mt-0.5" style={{ color: "#2982C4" }}>
                      {entry.article_url}
                    </a>
                  )}
                  <div className="text-xs mt-1" style={{ color: "#999" }}>
                    {new Date(entry.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(Array.isArray(entry.platforms) ? entry.platforms : []).filter(p => p.status === "published").map(p => {
                    const platform = PLATFORMS.find(pl => pl.key === p.platform);
                    return platform ? (
                      <span key={p.platform} className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: platform.color }}>{platform.icon}</span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
