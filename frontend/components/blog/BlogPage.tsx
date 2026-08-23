"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Eye,
  MessageSquare,
  CornerDownRight,
  Share2,
  MoreVertical,
  Trash2,
  Edit3,
  Smile,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  X,
  FileImage
} from "lucide-react";
import { Header } from "@/frontend/components/shared/Header";
import { Footer } from "@/frontend/components/shared/Footer";
import { getSupabaseBrowserClient } from "@/frontend/supabase/browser";
import { useToast } from "@/frontend/context/ToastContext";
import type { User } from "@supabase/supabase-js";
import styles from "./blog-page.module.css";

interface Reply {
  id: number;
  name: string;
  time: string;
  text: string;
}

interface Comment {
  id: number;
  name: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  edited: boolean;
  replies: Reply[];
  attachment?: {
    type: "image" | "gif" | "video";
    url: string;
    name: string;
  };
}

interface Post {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  date: string;
  readTime: string;
  views: number;
  likes: number;
  liked: boolean;
  content: React.ReactNode;
}

type BlogStyles = typeof styles;
type BlogAttachmentType = "image" | "gif" | "video";

type BlogReplyRow = {
  id: number;
  comment_id: number;
  author_name: string | null;
  text: string | null;
  created_at: string;
};

type BlogCommentRow = {
  id: number;
  post_id: number;
  author_name: string | null;
  text: string | null;
  likes: number | null;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
};

type BlogStatRow = {
  post_id: number;
  views: number | null;
  likes: number | null;
};

function isBlogAttachmentType(value: unknown): value is BlogAttachmentType {
  return value === "image" || value === "gif" || value === "video";
}

const defaultPosts = (styles: BlogStyles): Post[] => [
  {
    id: 1,
    title: "Top 5 Unforgettable Scents for Men and Women",
    excerpt: "Fragrance is a powerful tool that can evoke memories, influence moods, and even project confidence. Discover our top picks...",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80",
    author: "Tolu Omoniyi",
    date: "Apr 11",
    readTime: "4 min read",
    views: 124,
    likes: 42,
    liked: false,
    content: (
      <div className={styles.article}>
        <h2>The Power of Scent: Our Top 5 Curations</h2>
        <p>
          A great fragrance is an invisible accessory—it leaves a lasting impression and speaks volumes before you even say a word. In this guide, we dive into five of the most unforgettable scents currently defining the luxury space, curated for both men and women who appreciate the art of perfumery.
        </p>

        <h3>1. Royal Oud & Saffron</h3>
        <p>
          Deep, rich, and unmistakably majestic. This scent opens with a sharp burst of premium saffron, slowly melting into a heart of rich Cambodian oud and warm amber. Best suited for cooler evenings or when you want to project pure sophistication.
        </p>

        <h3>2. Celestial Rose & Pear</h3>
        <p>
          A delicate and modern take on the classic rose. It pairs damask rose petals with crisp, juicy pear and a base of light white musk. It is fresh, bright, and perfect for daily spring and summer wear.
        </p>

        <h3>3. Vetiver & Cashmere Wood</h3>
        <p>
          Earthy, smoky, yet incredibly smooth. With top notes of bitter orange, a heart of clean Haitian vetiver, and a warm dry-down of cashmere wood. This fragrance is highly versatile, providing a comforting, clean-cut aura.
        </p>

        <h3>4. Midnight Amber & Honeyed Tobacco</h3>
        <p>
          A sultry, mysterious fragrance featuring sweet, honeyed tobacco leaves wrapped in golden amber and vanilla bean. Cozy, warm, and highly seductive.
        </p>

        <h3>5. Bergamot & Coastal Driftwood</h3>
        <p>
          A clean, marine scent that immediately transports you to a Mediterranean coast. Sparkling Italian bergamot meets salty sea breeze notes and sun-drenched cedarwood.
        </p>

        <h2>How to Make Your Fragrance Last</h2>
        <p>
          Applying fragrance is an art. To ensure maximum longevity, apply to pulse points where your body heat naturally radiates the scent: your wrists, behind the ears, the base of your throat, and even the inner elbows.
        </p>
      </div>
    )
  },
  {
    id: 2,
    title: "Affordable Luxury: Best Perfumes Under $100",
    excerpt: "When it comes to fragrances, many people believe that luxury comes...",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80",
    author: "Tolu Omoniyi",
    date: "Apr 11",
    readTime: "4 min read",
    views: 245,
    likes: 87,
    liked: false,
    content: (
      <div className={styles.article}>
        <h2>Understanding Fragrance Families</h2>
        <p>Before diving into our top picks, it&apos;s essential to understand the different fragrance families. This knowledge will help you choose a scent that aligns with your preferences. Here are the primary fragrance families:</p>
        <ul>
          <li><b>Floral:</b> These scents are characterized by the presence of flowers. They can range from light and fresh to deep and sensual.</li>
          <li><b>Oriental:</b> Rich and exotic, oriental fragrances often include spices, resins, and warm notes.</li>
          <li><b>Woody:</b> These scents are grounded in earthy notes like sandalwood, cedar, and vetiver, often providing a warm and comforting aroma.</li>
          <li><b>Fresh:</b> This family includes citrus, green, and aquatic scents that evoke a sense of cleanliness and vitality.</li>
        </ul>
        <p>Understanding these families will guide you in selecting a fragrance that resonates with your personality.</p>

        <h2>Top Affordable Luxury Perfumes Under $100</h2>

        <h3>1. Marc Jacobs Daisy Eau So Fresh</h3>
        <p><b>Price:</b> Approximately $85 for 75ml</p>
        <p>Marc Jacobs Daisy Eau So Fresh is a delightful floral fragrance that embodies a playful spirit. With notes of wild berries, violet leaves, and a hint of grapefruit, this perfume is perfect for daytime wear. The whimsical bottle design adds to its charm, making it a lovely addition to any vanity.</p>

        <h3>2. Chloé Eau de Parfum</h3>
        <p><b>Price:</b> Approximately $90 for 75ml</p>
        <p>Chloé Eau de Parfum is a classic floral scent that exudes elegance and femininity. With notes of peony, rose, and honey, this fragrance is both fresh and sophisticated. It&apos;s ideal for special occasions or everyday wear, making it a versatile choice for any woman.</p>

        <h3>3. Dolce & Gabbana Light Blue</h3>
        <p><b>Price:</b> Approximately $75 for 100ml</p>
        <p>Light Blue by Dolce & Gabbana is a fresh and fruity fragrance that captures the essence of a Mediterranean summer. With notes of Sicilian lemon, apple, and cedarwood, this scent is invigorating and perfect for warm weather. It&apos;s a great option for those who enjoy a lively and refreshing aroma.</p>

        <h3>4. Yves Saint Laurent Mon Paris</h3>
        <p><b>Price:</b> Approximately $95 for 90ml</p>
        <p>Mon Paris is a modern and romantic fragrance that combines fruity and floral notes. With a blend of strawberry, raspberry, and jasmine, this scent is both sweet and sophisticated. The elegant bottle design reflects the luxurious experience this perfume offers.</p>

        <h3>5. Versace Bright Crystal</h3>
        <p><b>Price:</b> Approximately $85 for 90ml</p>
        <p>Bright Crystal by Versace is a vibrant and fresh fragrance that features notes of pomegranate, peony, and magnolia. This scent is perfect for those who enjoy a light and airy aroma that can be worn year-round. Its beautiful bottle design makes it a stunning addition to any fragrance collection.</p>

        <h2>Tips for Choosing the Right Perfume</h2>
        <p>Selecting the perfect fragrance can be a daunting task. Here are some tips to help you make the right choice:</p>
        <ul>
          <li><b>Test Before You Buy:</b> Always try a fragrance on your skin before purchasing. Body chemistry can alter how a scent smells.</li>
          <li><b>Consider the Occasion:</b> Think about when and where you will wear the fragrance.</li>
          <li><b>Layering Scents:</b> If you find a scent you love but want to enhance it, consider layering it with complementary body lotions or oils.</li>
        </ul>

        <h2>Caring for Your Perfume</h2>
        <p>To ensure your fragrances last longer and maintain their quality, follow these care tips.</p>
        <ul>
          <li><b>Store in a Cool, Dark Place:</b> Heat and light can degrade the quality of your perfume.</li>
          <li><b>Avoid Humidity:</b> Bathrooms can be humid, which is not ideal for storing perfumes.</li>
          <li><b>Don’t Shake the Bottle:</b> Shaking can introduce air into the bottle, which can alter the scent over time.</li>
        </ul>
      </div>
    )
  },
  {
    id: 3,
    title: "Discover Your Signature Fragrance at Arame",
    excerpt: "Finding the perfect fragrance can feel like searching for a needle in a...",
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80",
    author: "Tolu Omoniyi",
    date: "Apr 11",
    readTime: "4 min read",
    views: 189,
    likes: 64,
    liked: false,
    content: (
      <div className={styles.article}>
        <h2>Your Scent Identity: Defining Your Signature Scent</h2>
        <p>
          Your signature scent is more than just a perfume—it is a sensory memory, an extension of your presence, and a hallmark of your personal style. At Aramè, we believe scent selection is a deeply personal journey. Here is how you can find the fragrance that is uniquely yours.
        </p>

        <h3>Identify Your Preferred Notes</h3>
        <p>
          Take a look at other scents you naturally love in your environment. Do you love the smell of fresh linen (clean aldehydes), roasting coffee (gourmand), blooming jasmine (floral), or wet soil after rain (woody/earthy)? Translating these daily preferences into fragrance categories is the first step.
        </p>

        <h3>Understand Scent Concentrations</h3>
        <p>
          The concentration determines how strong the scent is and how long it lasts:
        </p>
        <ul>
          <li><b>Eau de Cologne (EDC):</b> 2-4% concentration, lasts up to 2 hours.</li>
          <li><b>Eau de Toilette (EDT):</b> 5-15% concentration, lasts up to 4 hours.</li>
          <li><b>Eau de Parfum (EDP):</b> 15-20% concentration, lasts 5-8 hours.</li>
          <li><b>Parfum / Extrait:</b> 20-30% concentration, lasts all day.</li>
        </ul>

        <h3>Test on Your Skin (Always)</h3>
        <p>
          Never buy a fragrance based solely on a paper strip. The pH level of your skin, body temperature, and even what you ate recently can slightly alter the scent development. Apply the fragrance and let it settle for at least 3 to 4 hours to experience the middle and base notes before making a decision.
        </p>
      </div>
    )
  }
];

export function BlogPage() {
  const [posts, setPosts] = useState<Post[]>(() => defaultPosts(styles));
  const [activePost, setActivePost] = useState<Post | null>(null);

  // Comments mapped by postId
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({
    1: [
      {
        id: 101,
        name: "Amara Okoye",
        time: "2 hours ago",
        text: "The Royal Oud sounds absolutely magnificent. Exactly what I need for evening events!",
        likes: 4,
        liked: false,
        edited: false,
        replies: []
      }
    ],
    2: [
      {
        id: 1,
        name: "Tolu Omoniyi",
        time: "3 minutes ago",
        text: "wow thats beautiful u feel me",
        likes: 1,
        liked: true,
        edited: false,
        replies: []
      }
    ],
    3: [
      {
        id: 301,
        name: "Chinedu Okafor",
        time: "1 day ago",
        text: "Super helpful guide. I never realized the differences in EDP and EDT concentrations!",
        likes: 3,
        liked: false,
        edited: false,
        replies: []
      }
    ]
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("Tolu Omoniyi");
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "reactions">("newest");
  const [sortOpen, setSortOpen] = useState(false);

  // Interactivity States
  const [shareMenuOpenId, setShareMenuOpenId] = useState<number | null>(null);
  const [commentInputText, setCommentInputText] = useState("");
  const [commentInputFocused, setCommentInputFocused] = useState(false);

  const [editorMedia, setEditorMedia] = useState<{
    open: boolean;
    kind: "image" | "gif" | "video" | null;
    url: string;
  }>({
    open: false,
    kind: null,
    url: ""
  });

  const [likesModal, setLikesModal] = useState<{
    open: boolean;
    count: number;
  }>({
    open: false,
    count: 0
  });

  const [discardModal, setDiscardModal] = useState<{
    open: boolean;
    onDiscard: (() => void) | null;
  }>({
    open: false,
    onDiscard: null
  });

  const [commentMenuOpenId, setCommentMenuOpenId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editInputText, setEditInputText] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [replyInputText, setReplyInputText] = useState("");


  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "gif" | "video">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const supabase = getSupabaseBrowserClient();
  const sortRef = useRef<HTMLDivElement>(null);

  // Fetch comments and replies from Supabase
  const fetchComments = useCallback(async () => {
    if (!supabase) return;

    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("blog_comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
        return;
      }

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from("blog_comment_replies")
        .select("*")
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Error fetching replies:", repliesError);
        return;
      }

      // Group replies by comment_id
      const repliesMap: Record<number, Reply[]> = {};
      ((repliesData ?? []) as BlogReplyRow[]).forEach((reply) => {
        const commentId = reply.comment_id;
        if (!repliesMap[commentId]) {
          repliesMap[commentId] = [];
        }
        repliesMap[commentId].push({
          id: reply.id,
          name: reply.author_name || "Guest",
          time: new Date(reply.created_at).toLocaleDateString(),
          text: reply.text || ""
        });
      });

      // Group comments by post_id
      const newCommentsMap: Record<number, Comment[]> = { 1: [], 2: [], 3: [] };
      ((commentsData ?? []) as BlogCommentRow[]).forEach((c) => {
        const pid = c.post_id;
        if (!newCommentsMap[pid]) {
          newCommentsMap[pid] = [];
        }
        newCommentsMap[pid].push({
          id: c.id,
          name: c.author_name || "Guest",
          time: new Date(c.created_at).toLocaleDateString(),
          text: c.text || "",
          likes: c.likes ?? 0,
          liked: false,
          edited: false,
          replies: repliesMap[c.id] || [],
          attachment: c.attachment_url ? {
            type: isBlogAttachmentType(c.attachment_type) ? c.attachment_type : "image",
            url: c.attachment_url,
            name: "Attached Media"
          } : undefined
        });
      });

      setCommentsMap(newCommentsMap);
    } catch (err) {
      console.error("Unexpected error fetching comments/replies:", err);
    }
  }, [supabase]);

  // Upload file attachment to Supabase Storage
  const uploadAttachment = async (fileDataUrl: string, fileKind: string): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const response = await fetch(fileDataUrl);
      const blob = await response.blob();
      const fileExt = fileKind === "video" ? "mp4" : "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `comment_uploads/${fileName}`;

      const { error } = await supabase.storage
        .from("blog-attachments")
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (error) {
        console.error("Storage upload error:", error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("blog-attachments")
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (e) {
      console.error("Error in uploadAttachment:", e);
      return null;
    }
  };

  // Initialize Posts & fetch Supabase data
  useEffect(() => {
    if (supabase) {
      let cancelled = false;

      // Fetch stats
      supabase
        .from("blog_stats")
        .select("*")
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            console.error("Error fetching blog stats:", error);
            return;
          }
          if (data) {
            const statsMap = ((data ?? []) as BlogStatRow[]).reduce<Record<number, BlogStatRow>>((acc, curr) => {
              acc[curr.post_id] = curr;
              return acc;
            }, {});
            setPosts((prevPosts) =>
              prevPosts.map((p) => {
                const stats = statsMap[p.id];
                if (stats) {
                  return {
                    ...p,
                    views: stats.views ?? p.views,
                    likes: stats.likes ?? p.likes
                  };
                }
                return p;
              })
            );
          }
        });

      // Fetch comments
      void Promise.resolve().then(fetchComments);

      return () => {
        cancelled = true;
      };
    }
  }, [fetchComments, supabase]);

  // Fetch Supabase User profile name
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser(data.session.user);
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: profileData }) => {
            if (profileData?.display_name) {
              setProfileName(profileData.display_name);
            } else if (data.session.user.email) {
              setProfileName(data.session.user.email.split("@")[0]);
            }
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
        setProfileName("Tolu Omoniyi");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // Click outside handlers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareMenuOpenId !== null) {
        setShareMenuOpenId(null);
      }
      if (commentMenuOpenId !== null) {
        setCommentMenuOpenId(null);
      }
      if (emojiMenuOpen) {
        setEmojiMenuOpen(false);
      }
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [shareMenuOpenId, commentMenuOpenId, sortOpen, emojiMenuOpen]);

  const { addToast } = useToast();

  const showToast = (message: string) => {
    addToast({ message, type: "success" });
  };

  const handlePostLike = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    const liked = !post.liked;
    const increment = liked ? 1 : -1;
    const newLikes = post.likes + increment;

    // Update state immediately
    const updated = posts.map((p) => {
      if (p.id === post.id) {
        return {
          ...p,
          liked,
          likes: newLikes
        };
      }
      return p;
    });
    setPosts(updated);

    if (activePost && activePost.id === post.id) {
      setActivePost({
        ...activePost,
        liked,
        likes: newLikes
      });
    }

    // Persist to Supabase
    if (supabase) {
      try {
        await supabase
          .from("blog_stats")
          .upsert({ post_id: post.id, likes: newLikes });
      } catch (err) {
        console.error("Error updating likes in Supabase:", err);
      }
    }
  };

  const handleShareClick = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(`${window.location.origin}/blog?id=${post.id}`).then(() => {
      showToast("Post link copied");
    });
    setShareMenuOpenId(null);
  };

  const openPost = async (post: Post) => {
    setActivePost(post);

    let newViews = post.views + 1;

    // Update in Supabase
    if (supabase) {
      try {
        const { data: stats } = await supabase
          .from("blog_stats")
          .select("views")
          .eq("post_id", post.id)
          .maybeSingle();

        if (stats) {
          newViews = (stats.views || 0) + 1;
        }

        await supabase
          .from("blog_stats")
          .upsert({ post_id: post.id, views: newViews });
      } catch (err) {
        console.error("Error updating views in Supabase:", err);
      }
    }

    // Update state
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === post.id) {
          return { ...p, views: newViews };
        }
        return p;
      })
    );
    setActivePost({ ...post, views: newViews });

    // Reset commenting state
    setCommentInputText("");
    setCommentInputFocused(false);
    setEditorMedia({ open: false, kind: null, url: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add Comment
  const handlePublishComment = async () => {
    if (!commentInputText.trim() && !editorMedia.open) return;
    if (!activePost) return;

    let attachmentUrl: string | null = null;
    if (editorMedia.open && editorMedia.url) {
      if (editorMedia.url.startsWith("data:")) {
        showToast("Uploading media...");
        attachmentUrl = await uploadAttachment(editorMedia.url, editorMedia.kind || "image");
        if (!attachmentUrl) {
          showToast("Upload failed, posting comment without media.");
        }
      } else {
        attachmentUrl = editorMedia.url;
      }
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from("blog_comments")
          .insert({
            post_id: activePost.id,
            user_id: currentUser?.id || null,
            author_name: profileName,
            text: commentInputText.trim(),
            attachment_url: attachmentUrl,
            attachment_type: editorMedia.kind,
            likes: 0
          });

        if (error) {
          console.error("Error creating comment:", error);
          showToast("Error publishing comment.");
          return;
        }

        await fetchComments();
      } catch (err) {
        console.error("Unexpected error creating comment:", err);
        showToast("Error publishing comment.");
        return;
      }
    } else {
      // Local fallback
      const newComment: Comment = {
        id: Date.now(),
        name: profileName,
        time: "just now",
        text: commentInputText.trim(),
        likes: 0,
        liked: false,
        edited: false,
        replies: [],
        attachment: editorMedia.open && editorMedia.kind && editorMedia.url ? {
          type: editorMedia.kind,
          url: editorMedia.url,
          name: "Attached Media"
        } : undefined
      };

      const activeComments = commentsMap[activePost.id] || [];
      setCommentsMap({
        ...commentsMap,
        [activePost.id]: [newComment, ...activeComments]
      });
    }

    setCommentInputText("");
    setCommentInputFocused(false);
    setEditorMedia({ open: false, kind: null, url: "" });
    if (editorRef.current) {
      editorRef.current.textContent = "";
    }
    showToast("Comment published");
  };

  const triggerCancelComment = () => {
    if (commentInputText.trim() || editorMedia.open) {
      setDiscardModal({
        open: true,
        onDiscard: () => {
          setCommentInputText("");
          setCommentInputFocused(false);
          setEditorMedia({ open: false, kind: null, url: "" });
          if (editorRef.current) {
            editorRef.current.textContent = "";
          }
          setDiscardModal({ open: false, onDiscard: null });
        }
      });
    } else {
      setCommentInputFocused(false);
    }
  };

  // Reply
  const handlePublishReply = async (commentId: number) => {
    if (!replyInputText.trim() || !activePost) return;

    if (supabase) {
      try {
        const { error } = await supabase
          .from("blog_comment_replies")
          .insert({
            comment_id: commentId,
            user_id: currentUser?.id || null,
            author_name: profileName,
            text: replyInputText.trim()
          });

        if (error) {
          console.error("Error publishing reply:", error);
          showToast("Error publishing reply.");
          return;
        }

        await fetchComments();
      } catch (err) {
        console.error("Unexpected error publishing reply:", err);
      }
    } else {
      // Local fallback
      const updatedComments = (commentsMap[activePost.id] || []).map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [
              ...c.replies,
              {
                id: Date.now(),
                name: profileName,
                time: "just now",
                text: replyInputText.trim()
              }
            ]
          };
        }
        return c;
      });

      setCommentsMap({
        ...commentsMap,
        [activePost.id]: updatedComments
      });
    }

    setReplyInputText("");
    setReplyingCommentId(null);
  };

  // Edit Comment
  const handleSaveEdit = async (commentId: number) => {
    if (!editInputText.trim() || !activePost) return;

    if (supabase) {
      try {
        const { error } = await supabase
          .from("blog_comments")
          .update({ text: editInputText.trim() })
          .eq("id", commentId);

        if (error) {
          console.error("Error editing comment:", error);
          showToast("Error editing comment.");
          return;
        }

        await fetchComments();
      } catch (err) {
        console.error("Unexpected error editing comment:", err);
      }
    } else {
      // Local fallback
      const updatedComments = (commentsMap[activePost.id] || []).map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            text: editInputText.trim(),
            edited: true
          };
        }
        return c;
      });

      setCommentsMap({
        ...commentsMap,
        [activePost.id]: updatedComments
      });
    }

    setEditingCommentId(null);
    setEditInputText("");
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: number) => {
    if (!activePost) return;

    if (supabase) {
      try {
        const { error } = await supabase
          .from("blog_comments")
          .delete()
          .eq("id", commentId);

        if (error) {
          console.error("Error deleting comment:", error);
          showToast("Error deleting comment.");
          return;
        }

        await fetchComments();
      } catch (err) {
        console.error("Unexpected error deleting comment:", err);
      }
    } else {
      // Local fallback
      const updatedComments = (commentsMap[activePost.id] || []).filter(
        (c) => c.id !== commentId
      );

      setCommentsMap({
        ...commentsMap,
        [activePost.id]: updatedComments
      });
    }
    showToast("Comment deleted");
  };

  // Comment Like
  const handleCommentLike = async (commentId: number) => {
    if (!activePost) return;

    const commentsList = commentsMap[activePost.id] || [];
    const commentObj = commentsList.find((c) => c.id === commentId);
    if (!commentObj) return;

    const liked = !commentObj.liked;
    const newLikes = commentObj.likes + (liked ? 1 : -1);

    // Update state immediately
    const updatedComments = commentsList.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          liked,
          likes: newLikes
        };
      }
      return c;
    });

    setCommentsMap({
      ...commentsMap,
      [activePost.id]: updatedComments
    });

    // Update Supabase
    if (supabase) {
      try {
        await supabase
          .from("blog_comments")
          .update({ likes: newLikes })
          .eq("id", commentId);
      } catch (err) {
        console.error("Error liking comment in Supabase:", err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEditorMedia({
          open: true,
          kind: mediaType,
          url: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMediaClick = (kind: "image" | "gif" | "video") => {
    setMediaType(kind);
    if (fileInputRef.current) {
      if (kind === "image") fileInputRef.current.accept = "image/*";
      else if (kind === "gif") fileInputRef.current.accept = "image/gif";
      else if (kind === "video") fileInputRef.current.accept = "video/*";
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Get active sorted comments
  const getSortedComments = () => {
    if (!activePost) return [];
    const list = [...(commentsMap[activePost.id] || [])];

    if (sortMode === "oldest") {
      return list.reverse();
    } else if (sortMode === "reactions") {
      return list.sort((a, b) => b.likes - a.likes);
    }
    return list;
  };

  const activePostComments = activePost ? commentsMap[activePost.id] || [] : [];
  const sortedComments = getSortedComments();

  return (
    <>
      <Header variant="shop" />

      <main className={styles.blogPage}>
        <div className={styles.container}>
          <AnimatePresence mode="wait">
            {!activePost ? (
              // List View
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.blogLabel}>All Posts</div>
                <div className={styles.blogGrid}>
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className={styles.blogCard}
                      onClick={() => openPost(post)}
                    >
                      <div className={styles.blogImageWrap}>
                        <img
                          className={styles.blogImage}
                          src={post.image}
                          alt={post.title}
                        />
                      </div>
                      <div className={styles.blogContent}>
                        <div className={styles.authorRow}>
                          <span className={styles.avatar}>
                            {post.author.charAt(0).toUpperCase()}
                          </span>
                          <div className={styles.authorMeta}>
                            <div className={styles.authorName}>{post.author}</div>
                            <div>{post.date} · {post.readTime}</div>
                          </div>

                          <button
                            className={styles.menuBtn}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareMenuOpenId(
                                shareMenuOpenId === post.id ? null : post.id
                              );
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {shareMenuOpenId === post.id && (
                            <div
                              className={styles.shareMenu}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => handleShareClick(e, post)}
                              >
                                <Share2 size={14} /> Share Post
                              </button>
                            </div>
                          )}
                        </div>

                        <h2 className={styles.blogTitle}>{post.title}</h2>
                        <p className={styles.blogExcerpt}>{post.excerpt}</p>

                        <div className={styles.cardSpacer} />

                        <div className={styles.cardFooter}>
                          <span className={styles.stat}>
                            <Eye size={15} />
                            <span>{post.views}</span>
                          </span>
                          <span className={styles.stat}>
                            <MessageSquare size={14} />
                            <span>{commentsMap[post.id]?.length || 0}</span>
                          </span>

                          <motion.button
                            className={styles.heartBtn}
                            type="button"
                            onClick={(e) => handlePostLike(e, post)}
                            whileTap={{ scale: 1.35 }}
                            transition={{ type: "spring", stiffness: 400, damping: 12 }}
                          >
                            {post.likes > 0 && <span>{post.likes}</span>}
                            <Heart
                              size={15}
                              className={post.liked ? styles.likedHeart : ""}
                            />
                          </motion.button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </motion.div>
            ) : (
              // Detail View
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className={styles.detailView}
              >
                <button
                  className={styles.backBtn}
                  onClick={() => setActivePost(null)}
                >
                  ← See All Posts
                </button>

                <article className={styles.postShell}>
                  <div className={styles.postMeta}>
                    <span className={styles.avatar}>
                      {activePost.author.charAt(0).toUpperCase()}
                    </span>
                    <div className={styles.authorMeta}>
                      <span className={styles.authorName}>{activePost.author}</span>
                      <div>{activePost.date} · {activePost.readTime}</div>
                    </div>
                  </div>

                  <h1 className={styles.postTitle}>{activePost.title}</h1>
                  <p className={styles.postP}>{activePost.excerpt}</p>

                  <img
                    className={styles.postImage}
                    src={activePost.image}
                    alt={activePost.title}
                  />
                  <div className={styles.caption}>
                    Fragrance curation at Aramè
                  </div>

                  <div className={styles.article}>{activePost.content}</div>

                  <div className={styles.postShare}>
                    <span>Share:</span>
                    <div className={styles.shareIcons}>
                      <button
                        className={styles.shareIconBtn}
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.href);
                          showToast("Article link copied!");
                        }}
                        title="Copy Link"
                      >
                        <LinkIcon size={16} />
                      </button>
                      <a href="https://instagram.com" target="_blank" rel="noreferrer" className={styles.shareIconBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      </a>
                      <a href="https://twitter.com" target="_blank" rel="noreferrer" className={styles.shareIconBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                      </a>
                      <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={styles.shareIconBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                      </a>
                    </div>
                  </div>

                  <div className={styles.postBottomStats}>
                    <span>{activePost.views} {activePost.views === 1 ? "view" : "views"}</span>
                    <span>{activePostComments.length} {activePostComments.length === 1 ? "comment" : "comments"}</span>

                    <motion.button
                      className={`${styles.detailLikeBtn} ${
                        activePost.liked ? styles.detailLikeBtnLiked : ""
                      }`}
                      onClick={(e) => handlePostLike(e, activePost)}
                      whileTap={{ scale: 1.4 }}
                      transition={{ type: "spring", stiffness: 450, damping: 10 }}
                    >
                      <Heart
                        size={18}
                        className={activePost.liked ? styles.likedHeart : ""}
                      />
                      <span>{activePost.likes} {activePost.likes === 1 ? "Like" : "Likes"}</span>
                    </motion.button>
                  </div>
                </article>

                {/* Recent Posts Grid */}
                <section className={styles.recent}>
                  <div className={styles.recentHead}>
                    <span>Recent Posts</span>
                    <button
                      className={styles.seeAllBtn}
                      onClick={() => setActivePost(null)}
                    >
                      See All
                    </button>
                  </div>
                  <div className={styles.recentGrid}>
                    {posts
                      .filter((p) => p.id !== activePost.id)
                      .slice(0, 2)
                      .map((post) => (
                        <article
                          key={post.id}
                          className={styles.blogCard}
                          onClick={() => openPost(post)}
                        >
                          <div className={styles.blogImageWrap}>
                            <img
                              className={styles.blogImage}
                              src={post.image}
                              alt={post.title}
                            />
                          </div>
                          <div className={styles.blogContent}>
                            <div className={styles.authorRow}>
                              <span className={styles.avatar}>
                                {post.author.charAt(0).toUpperCase()}
                              </span>
                              <div className={styles.authorMeta}>
                                <div className={styles.authorName}>{post.author}</div>
                                <div>{post.date} · {post.readTime}</div>
                              </div>
                            </div>
                            <h2 className={styles.blogTitle}>{post.title}</h2>
                            <div className={styles.cardSpacer} />
                            <div className={styles.cardFooter}>
                              <span className={styles.stat}>
                                <Eye size={15} />
                                <span>{post.views}</span>
                              </span>
                              <span className={styles.stat}>
                                <MessageSquare size={14} />
                                <span>{commentsMap[post.id]?.length || 0}</span>
                              </span>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                </section>

                {/* Comments Section */}
                <section className={styles.commentsBox}>
                  <div className={styles.commentsHead}>
                    <span>Comments ({activePostComments.length})</span>
                    <span className={styles.miniAvatar}>
                      {profileName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Comment Input */}
                  <div style={{ marginBottom: "30px" }}>
                    <div
                      ref={editorRef}
                      className={`${styles.commentInput} ${
                        commentInputFocused || commentInputText ? styles.expanded : ""
                      }`}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setCommentInputFocused(true)}
                      onBlur={(e) => {
                        const text = e.currentTarget.textContent || "";
                        // Delay slightly so tools clicks can fire
                        setTimeout(() => {
                          if (!text.trim() && !editorMedia.open) {
                            setCommentInputFocused(false);
                          }
                        }, 200);
                      }}
                      onInput={(e) => setCommentInputText(e.currentTarget.textContent || "")}
                      data-placeholder="Write a comment..."
                    />

                    {/* Media attachments */}
                    {editorMedia.open && (
                      <div className={styles.editorMedia}>
                        <div className={styles.mediaToolbar}>
                          <span>⚙ Settings</span>
                          <button
                            type="button"
                            className={styles.mediaToolbarBtn}
                            onClick={() => setEditorMedia({ open: false, kind: null, url: "" })}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                        {editorMedia.kind === "video" ? (
                          <video src={editorMedia.url} controls style={{ width: "100%", maxHeight: "280px", display: "block" }} />
                        ) : (
                          <img src={editorMedia.url} alt="Attached media preview" />
                        )}
                        <div className={styles.captionPill}>Caption attached</div>
                      </div>
                    )}

                    {/* Editor Toolbar */}
                    {commentInputFocused && (
                      <div className={styles.commentActionbar}>
                        <div className={styles.toolsRow} style={{ position: "relative" }}>
                          <button
                            type="button"
                            className={styles.toolBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmojiMenuOpen(!emojiMenuOpen);
                            }}
                            title="Add Emoji"
                          >
                            <Smile size={18} />
                          </button>

                          {emojiMenuOpen && (
                            <div className={styles.emojiDropdown} onClick={(e) => e.stopPropagation()}>
                              {["😀", "😂", "😍", "👍", "🎉", "🔥", "❤️", "😮", "✨", "🌸", "🙌", "💡", "💯", "👏", "👀"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setCommentInputText((prev) => {
                                      const nextText = prev + emoji;
                                      if (editorRef.current) {
                                        editorRef.current.textContent = nextText;
                                      }
                                      return nextText;
                                    });
                                    setEmojiMenuOpen(false);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            className={styles.toolBtn}
                            onClick={() => handleMediaClick("image")}
                            title="Add Image"
                          >
                            <ImageIcon size={18} />
                          </button>
                          <button
                            type="button"
                            className={styles.toolBtn}
                            onClick={() => handleMediaClick("gif")}
                            title="Add GIF"
                          >
                            <FileImage size={18} />
                          </button>
                          <button
                            type="button"
                            className={styles.toolBtn}
                            onClick={() => handleMediaClick("video")}
                            title="Add Video"
                          >
                            <Video size={18} />
                          </button>
                        </div>

                        <div>
                          <button
                            className={styles.btn}
                            onClick={triggerCancelComment}
                          >
                            Cancel
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={handlePublishComment}
                          >
                            Publish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments Sorting */}
                  <div className={styles.sortContainer} ref={sortRef}>
                    <span>Sort by:</span>
                    <button
                      className={styles.sortBtn}
                      onClick={() => setSortOpen(!sortOpen)}
                    >
                      {sortMode === "newest"
                        ? "Newest"
                        : sortMode === "oldest"
                        ? "Oldest"
                        : "Most Reactions"} ▾
                    </button>

                    {sortOpen && (
                      <div className={styles.sortMenu}>
                        <div
                          className={`${styles.sortMenuItem} ${
                            sortMode === "newest" ? styles.sortMenuItemActive : ""
                          }`}
                          onClick={() => {
                            setSortMode("newest");
                            setSortOpen(false);
                          }}
                        >
                          Newest
                        </div>
                        <div
                          className={`${styles.sortMenuItem} ${
                            sortMode === "oldest" ? styles.sortMenuItemActive : ""
                          }`}
                          onClick={() => {
                            setSortMode("oldest");
                            setSortOpen(false);
                          }}
                        >
                          Oldest
                        </div>
                        <div
                          className={`${styles.sortMenuItem} ${
                            sortMode === "reactions" ? styles.sortMenuItemActive : ""
                          }`}
                          onClick={() => {
                            setSortMode("reactions");
                            setSortOpen(false);
                          }}
                        >
                          Most Reactions
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comments List */}
                  <div className={styles.commentsList}>
                    {sortedComments.length === 0 ? (
                      <p style={{ color: "#8c7f70", fontStyle: "italic", textAlign: "center", margin: "20px 0" }}>
                        No comments yet. Start the conversation!
                      </p>
                    ) : (
                      sortedComments.map((comment) => (
                        <div key={comment.id} className={styles.comment}>
                          <span className={styles.avatar}>
                            {comment.name.charAt(0).toUpperCase()}
                          </span>

                          <div className={styles.commentBody}>
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuthor}>{comment.name}</span>
                              <span className={styles.commentTime}>{comment.time}</span>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className={styles.editInputBox}>
                                <textarea
                                  className={styles.editInput}
                                  value={editInputText}
                                  onChange={(e) => setEditInputText(e.target.value)}
                                />
                                <div className={styles.editActions}>
                                  <button
                                    className={styles.btn}
                                    onClick={() => setEditingCommentId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={() => handleSaveEdit(comment.id)}
                                  >
                                    Update
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className={styles.commentText}>{comment.text}</p>
                                {comment.attachment && (
                                  <div className={styles.commentAttachmentWrap}>
                                    {comment.attachment.type === "video" ? (
                                      <video src={comment.attachment.url} controls className={styles.commentAttachment} />
                                    ) : (
                                      <img src={comment.attachment.url} alt="Attached media" className={styles.commentAttachment} />
                                    )}
                                  </div>
                                )}
                                {comment.edited && (
                                  <span className={styles.editedPill}>Edited</span>
                                )}
                              </>
                            )}

                            <div className={styles.commentActions}>
                              <motion.button
                                className={`${styles.commentActionBtn} ${
                                  comment.liked ? styles.commentActionBtnLiked : ""
                                }`}
                                onClick={() => handleCommentLike(comment.id)}
                                whileTap={{ scale: 1.3 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              >
                                <Heart
                                  size={13}
                                  className={comment.liked ? styles.likedHeart : ""}
                                />
                                <span>{comment.liked ? "Liked" : "Like"}</span>
                              </motion.button>

                              <button
                                className={styles.commentActionBtn}
                                onClick={() => {
                                  setReplyingCommentId(
                                    replyingCommentId === comment.id ? null : comment.id
                                  );
                                  setReplyInputText("");
                                }}
                              >
                                <CornerDownRight size={13} />
                                <span>Reply</span>
                              </button>

                              {comment.likes > 0 && (
                                <span
                                  className={styles.likesTrigger}
                                  onClick={() => setLikesModal({ open: true, count: comment.likes })}
                                >
                                  ({comment.likes} {comment.likes === 1 ? "reaction" : "reactions"})
                                </span>
                              )}
                            </div>

                            {/* Replies List */}
                            <div className={styles.replyWrap}>
                              {comment.replies.length > 0 && (
                                <div className={styles.repliesList}>
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className={styles.replyItem}>
                                      <span className={styles.miniAvatar}>
                                        {reply.name.charAt(0).toUpperCase()}
                                      </span>
                                      <div className={styles.replyContent}>
                                        <div className={styles.commentHeader}>
                                          <span className={styles.commentAuthor}>{reply.name}</span>
                                          <span className={styles.commentTime}>{reply.time}</span>
                                        </div>
                                        <p className={styles.commentText}>{reply.text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {replyingCommentId === comment.id && (
                                <div className={styles.replyInputBox}>
                                  <input
                                    type="text"
                                    className={styles.replyInput}
                                    placeholder="Write a reply..."
                                    value={replyInputText}
                                    onChange={(e) => setReplyInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handlePublishReply(comment.id);
                                      }
                                    }}
                                  />
                                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                                    <button
                                      className={styles.btn}
                                      onClick={() => setReplyingCommentId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      className={`${styles.btn} ${styles.btnPrimary}`}
                                      onClick={() => handlePublishReply(comment.id)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Options menu for comments */}
                          <div className={styles.commentMenuContainer}>
                            <button
                              className={styles.commentMenuBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCommentMenuOpenId(
                                  commentMenuOpenId === comment.id ? null : comment.id
                                );
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {commentMenuOpenId === comment.id && (
                              <div
                                className={styles.commentDropdown}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditInputText(comment.text);
                                    setCommentMenuOpenId(null);
                                  }}
                                >
                                  <Edit3 size={13} /> Edit
                                </button>
                                <hr />
                                <button onClick={() => handleDeleteComment(comment.id)}>
                                  <Trash2 size={13} style={{ color: "#ef4028" }} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />

      {/* Discard Modal */}
      {discardModal.open && (
        <div className={styles.modalLayer}>
          <div className={styles.modalContent}>
            <button
              className={styles.modalClose}
              onClick={() => setDiscardModal({ open: false, onDiscard: null })}
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>Discard Comment?</h2>
            <p className={styles.modalText}>Your comment will not be saved.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.lightBtn}
                onClick={() => setDiscardModal({ open: false, onDiscard: null })}
              >
                Cancel
              </button>
              <button
                className={styles.darkBtn}
                onClick={() => discardModal.onDiscard?.()}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Likes Modal */}
      {likesModal.open && (
        <div className={styles.modalLayer}>
          <div className={styles.modalContent}>
            <button
              className={styles.modalClose}
              onClick={() => setLikesModal({ open: false, count: 0 })}
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>Likes</h2>
            <div className={styles.likesList}>
              {Array.from({ length: likesModal.count }).map((_, index) => (
                <div key={index} className={styles.likePerson}>
                  <span className={styles.avatar}>U</span>
                  <span>Supporter {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image/GIF/Video attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
}
