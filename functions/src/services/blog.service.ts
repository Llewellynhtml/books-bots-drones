import {db} from "../config/firebase";

const blogPostsCollection = db.collection("blogPosts");

interface BlogPostInput {
  title?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  authorName?: string;
  tags?: unknown;
  isPublished?: boolean;
}

interface BlogPostQuery {
  isPublished?: string;
  tag?: string;
  search?: string;
}

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const cleanBlogPostInput = (body: BlogPostInput) => {
  const title = cleanText(body.title);
  const excerpt = cleanText(body.excerpt);
  const content = cleanText(body.content);

  if (!title || !excerpt || !content) {
    return null;
  }

  return {
    title,
    slug: createSlug(title),
    excerpt,
    content,
    coverImageUrl: cleanText(body.coverImageUrl),
    authorName: cleanText(body.authorName) || "Books Bots Drones",
    tags: toStringArray(body.tags),
    isPublished: body.isPublished ?? false,
  };
};

export const createBlogPostRecord = async (body: BlogPostInput) => {
  const blogPostInput = cleanBlogPostInput(body);

  if (!blogPostInput) {
    return {
      status: 400,
      body: {
        success: false,
        message: "title, excerpt and content are required",
      },
    };
  }

  const existing = await blogPostsCollection
    .where("slug", "==", blogPostInput.slug)
    .limit(1)
    .get();

  if (!existing.empty) {
    return {
      status: 409,
      body: {
        success: false,
        message: "Blog post already exists",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = blogPostsCollection.doc();
  const publishedAt = blogPostInput.isPublished ? now : null;
  const blogPost = {
    id: docRef.id,
    ...blogPostInput,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(blogPost);

  return {
    status: 201,
    body: {
      success: true,
      message: "Blog post created successfully",
      blogPost,
    },
  };
};

export const getBlogPostRecords = async (query: BlogPostQuery) => {
  const snapshot = await blogPostsCollection.orderBy("createdAt", "desc").get();
  let blogPosts = snapshot.docs.map((doc) => doc.data());

  if (query.isPublished === "true" || query.isPublished === "false") {
    const isPublished = query.isPublished === "true";
    blogPosts = blogPosts.filter((post) => post.isPublished === isPublished);
  } else {
    blogPosts = blogPosts.filter((post) => post.isPublished === true);
  }

  if (query.tag) {
    const tag = query.tag.toLowerCase();
    blogPosts = blogPosts.filter((post) => {
      const tags = Array.isArray(post.tags) ? post.tags : [];
      return tags.some((item) => String(item).toLowerCase() === tag);
    });
  }

  if (query.search) {
    const search = query.search.toLowerCase();
    blogPosts = blogPosts.filter((post) => {
      const title = String(post.title || "").toLowerCase();
      const excerpt = String(post.excerpt || "").toLowerCase();
      const content = String(post.content || "").toLowerCase();

      return (
        title.includes(search) ||
        excerpt.includes(search) ||
        content.includes(search)
      );
    });
  }

  return {
    success: true,
    count: blogPosts.length,
    blogPosts,
  };
};

export const getBlogPostRecordById = async (id: string, includeDraft = false) => {
  const blogPostDoc = await blogPostsCollection.doc(id).get();

  if (!blogPostDoc.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Blog post not found",
      },
    };
  }

  const blogPost = blogPostDoc.data();

  if (!includeDraft && !blogPost?.isPublished) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Blog post not found",
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      blogPost,
    },
  };
};

export const updateBlogPostRecord = async (
  id: string,
  body: Partial<BlogPostInput>
) => {
  const blogPostDoc = blogPostsCollection.doc(id);
  const currentPost = await blogPostDoc.get();

  if (!currentPost.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Blog post not found",
      },
    };
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = cleanText(body.title);

    if (!title) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Blog title cannot be empty",
        },
      };
    }

    updateData.title = title;
    updateData.slug = createSlug(title);
  }

  if (typeof body.excerpt === "string") {
    updateData.excerpt = cleanText(body.excerpt);
  }

  if (typeof body.content === "string") {
    updateData.content = cleanText(body.content);
  }

  if (typeof body.coverImageUrl === "string") {
    updateData.coverImageUrl = cleanText(body.coverImageUrl);
  }

  if (typeof body.authorName === "string") {
    updateData.authorName = cleanText(body.authorName);
  }

  if (body.tags !== undefined) {
    updateData.tags = toStringArray(body.tags);
  }

  if (typeof body.isPublished === "boolean") {
    updateData.isPublished = body.isPublished;
    updateData.publishedAt = body.isPublished ? new Date().toISOString() : null;
  }

  updateData.updatedAt = new Date().toISOString();

  await blogPostDoc.update(updateData);

  const updatedPost = await blogPostDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Blog post updated successfully",
      blogPost: updatedPost.data(),
    },
  };
};

export const deleteBlogPostRecord = async (id: string) => {
  const blogPostDoc = blogPostsCollection.doc(id);
  const currentPost = await blogPostDoc.get();

  if (!currentPost.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Blog post not found",
      },
    };
  }

  await blogPostDoc.delete();

  return {
    status: 200,
    body: {
      success: true,
      message: "Blog post deleted successfully",
    },
  };
};

