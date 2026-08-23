/* eslint-disable max-len */
import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  addWishlistItemRecord,
  getWishlistRecord,
  removeWishlistItemRecord,
  clearWishlistRecord,
} from "../services/wishlist.service";

export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const wishlist = await getWishlistRecord(uid);
    return res.status(200).json(wishlist);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get wishlist";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const clearWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
    return res.status(200).json(await clearWishlistRecord(uid));
  } catch (error) {
    return res.status(500).json({success: false, message: error instanceof Error ? error.message : "Failed to clear wishlist"});
  }
};

export const addWishlistItem = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await addWishlistItemRecord(uid, req.body.productId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ?
        error.message :
        "Failed to add product to wishlist";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const removeWishlistItem = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await removeWishlistItemRecord(uid, req.params.productId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ?
        error.message :
        "Failed to remove product from wishlist";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
