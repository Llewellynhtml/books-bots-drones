import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  createReviewRecord,
  deleteReviewRecord,
  getReviewRecords,
} from "../services/review.service";

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await createReviewRecord(uid, req.user?.email, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create review";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getReviewRecords(req.query as {productId?: string});
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get reviews";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await deleteReviewRecord(
      getParam(req.params.id),
      uid,
      req.user?.role
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete review";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
