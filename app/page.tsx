"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ArticleData {
  title: string;
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
  articleUrl: string;
  imageUrl: string | null;
  platforms: PublishResult[];
  publishedAt: string;
}

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "IG", color: "#E1306C", charLimit: null },
  { key: "facebook", label: "Facebook", icon: "f", color: "#1877F2", charLimit: null },
  { key: "twitter", label: "X", icon: "\ud835\udd4f", color: "#000000", charLimit: 280 },
  { key: "bluesky", label: "Bluesky", icon: "\ud83e\udd8b", color: "#0085FF", charLimit: 300 },
  { key: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2", charLimit: null },
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [posts, setPosts] = useState<Record<string, string> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/check").then(r => r.json()).then(d => {
      if (!d.authenticated) router.push("/login");
    });
  }, [router]);

  const loadHistory = useCallback(() => {
    fetch("/api/history").then(r => r.json()).then(setHistory).catch(() => {});
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleFetchUrl() {
    if (!url.trim()) return;
    setFetching(true);
    setError("");
    setArticle(null);
    setPosts(null);
    setPublishResults(null);
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
    if (!article) return;
    setGenerating(true);
    setError("");
    setPosts(null);
    setPublishResults(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: article.title, body: article.body, url: url.trim() }),
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

  async function handlePublish() {
    if (!posts || !selectedPlatforms.length) return;
    setPublishing(true);
    setPublishResults(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts, platforms: selectedPlatforms, imageUrl: article?.imageUrl, articleUrl: url.trim() }),
      });
      const { results } = await res.json();
      setPublishResults(results);
      loadHistory();
    } catch {
      setError("Failed to publish");
    } finally {
      setPublishing(false);
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Social Publisher</h1>
      <p className="text-gray-500 text-sm mb-6">Paste an article URL to generate and publish social media posts.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
          <button onClick={() => setError("")} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* URL Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFetchUrl(); } }}
          placeholder="https://planetdetroit.org/2026/03/your-article..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          autoFocus
        />
        <button
          onClick={handleFetchUrl}
          disabled={fetching || !url.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {fetching ? "Fetching..." : "Fetch Article"}
        </button>
      </div>

      {/* Article Preview */}
      {article && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex gap-5">
            {article.imageUrl && (
              <img src={article.imageUrl} alt="" className="w-40 h-28 object-cover rounded-lg flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 mb-1">{article.title}</h2>
              <p className="text-gray-500 text-sm line-clamp-3">{article.description}</p>
              <p className="text-xs text-gray-400 mt-2">
                Source: {article.source === "wordpress" ? "Planet Detroit (WordPress)" : "Open Graph"}
              </p>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium">
            {generating ? "Generating Posts..." : "Generate Social Posts"}
          </button>
        </div>
      )}

      {/* Post Preview Cards */}
      {posts && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {PLATFORMS.filter(({ key }) => posts[key]).map(({ key, label, icon, color, charLimit }) => {
              const isSelected = selectedPlatforms.includes(key);
              const charCount = (posts[key] || "").length;
              const overLimit = charLimit ? charCount > charLimit : false;

              return (
                <div key={key} className="bg-white rounded-xl overflow-hidden transition-shadow"
                  style={{ border: `2px solid ${isSelected ? color : "#e5e7eb"}`, boxShadow: isSelected ? "0 2px 12px rgba(0,0,0,0.08)" : "none" }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: color }}>{icon}</span>
                      <span className="font-semibold text-sm">{label}</span>
                      {charLimit && (
                        <span className={`text-xs ml-2 ${overLimit ? "text-red-500 font-bold" : "text-gray-400"}`}>
                          {charCount}/{charLimit}
                        </span>
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPlatforms(prev => [...prev, key]);
                          else setSelectedPlatforms(prev => prev.filter(p => p !== key));
                        }} className="w-3.5 h-3.5" />
                      Publish
                    </label>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: color }}>PD</div>
                      <div>
                        <div className="font-semibold text-sm">Planet Detroit</div>
                        <div className="text-xs text-gray-400">
                          {key === "twitter" ? "@PlanetDetroit" :
                           key === "bluesky" ? "@planetdetroit.org" :
                           key === "instagram" ? "@planetdetroit" : "Planet Detroit"}
                        </div>
                      </div>
                    </div>

                    {article?.imageUrl && (
                      <div className="rounded-lg overflow-hidden mb-3 bg-gray-100">
                        <img src={article.imageUrl} alt="" className="w-full h-44 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}

                    {editingPost === key ? (
                      <textarea value={posts[key]} onChange={(e) => updatePost(key, e.target.value)}
                        rows={Math.max(4, (posts[key] || "").split("\n").length + 1)}
                        className="w-full text-sm leading-relaxed p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        autoFocus onBlur={() => setEditingPost(null)} />
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words cursor-text rounded p-1.5 hover:bg-gray-50 transition-colors"
                        onClick={() => setEditingPost(key)} title="Click to edit">
                        {posts[key]}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                    <button onClick={() => setEditingPost(editingPost === key ? null : key)}
                      className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                      {editingPost === key ? "Done" : "Edit"}
                    </button>
                    <button onClick={() => copyToClipboard(posts[key], key)}
                      className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                      {copiedField === key ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Publish */}
          {selectedPlatforms.length > 0 && (
            <div className="flex items-center gap-3 mb-6">
              <button onClick={handlePublish} disabled={publishing}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium">
                {publishing ? "Publishing..." : `Publish Now to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
              </button>
              {publishing && <span className="text-gray-500 text-sm">This may take a moment...</span>}
            </div>
          )}

          {/* Results */}
          {publishResults && (
            <div className="mb-8 space-y-1">
              {publishResults.map((r, i) => (
                <div key={i} className={`px-4 py-2 rounded-md text-sm ${
                  r.status === "published" ? "bg-green-50 text-green-800" :
                  r.status === "skipped" ? "bg-yellow-50 text-yellow-800" : "bg-red-50 text-red-800"}`}>
                  <strong>{r.platform}</strong>: {r.status === "published" ? "Published!" : r.status}
                  {r.reason ? ` \u2014 ${r.reason}` : ""}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h2>
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <a href={entry.articleUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate block">{entry.articleUrl}</a>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(entry.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {entry.platforms.filter(p => p.status === "published").map(p => {
                    const platform = PLATFORMS.find(pl => pl.key === p.platform);
                    return platform ? (
                      <span key={p.platform} className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
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
