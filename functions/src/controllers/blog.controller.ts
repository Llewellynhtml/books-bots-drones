import {Request, Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  createBlogPostRecord,
  deleteBlogPostRecord,
  getBlogPostRecordById,
  getBlogPostRecords,
  updateBlogPostRecord,
} from "../services/blog.service";

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createBlogPost = async (req: Request, res: Response) => {
  try {
    const result = await createBlogPostRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create blog post";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getBlogPosts = async (req: Request, res: Response) => {
  try {
    const result = await getBlogPostRecords(req.query);
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get blog posts";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getBlogPostById = async (req: AuthRequest, res: Response) => {
  try {
    const includeDraft = req.user?.role === "admin";
    const result = await getBlogPostRecordById(
      getParam(req.params.id),
      includeDraft
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get blog post";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateBlogPost = async (req: Request, res: Response) => {
  try {
    const result = await updateBlogPostRecord(getParam(req.params.id), req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update blog post";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteBlogPost = async (req: Request, res: Response) => {
  try {
    const result = await deleteBlogPostRecord(getParam(req.params.id));
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete blog post";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
