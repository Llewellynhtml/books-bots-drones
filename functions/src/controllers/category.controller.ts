import {Request, Response} from "express";

import {
  createCategoryRecord,
  deleteCategoryRecord,
  getCategoryRecordById,
  getCategoryRecords,
  updateCategoryRecord,
} from "../services/category.service";

const getCategoryId = (req: Request) => {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const result = await createCategoryRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create category";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const result = await getCategoryRecords();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load categories";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const category = await getCategoryRecordById(getCategoryId(req));

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load category";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const result = await updateCategoryRecord(getCategoryId(req), req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update category";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const result = await deleteCategoryRecord(getCategoryId(req));
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete category";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
