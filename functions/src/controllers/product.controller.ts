import {Request, Response} from "express";

import {
  createProductRecord,
  deleteProductRecord,
  getProductRecordById,
  getProductRecords,
  updateProductRecord,
} from "../services/product.service";
import {ProductQuery} from "../types/product.types";

const getProductId = (req: Request) => {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const result = await createProductRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create product";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const result = await getProductRecords(req.query as ProductQuery);
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load products";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await getProductRecordById(getProductId(req));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load product";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const result = await updateProductRecord(getProductId(req), req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const result = await deleteProductRecord(getProductId(req));
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete product";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
