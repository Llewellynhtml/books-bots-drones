import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  addCartItemRecord,
  clearCartRecord,
  getCartRecord,
  removeCartItemRecord,
  updateCartItemRecord,
} from "../services/cart.service";

const getUid = (req: AuthRequest) => req.user?.uid;

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await getCartRecord(uid);
    return res.status(200).json(cart);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get cart";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const addCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await addCartItemRecord(
      uid,
      req.body.productId,
      req.body.quantity
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add product to cart";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await updateCartItemRecord(
      uid,
      req.params.productId,
      req.body.quantity
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update cart item";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const removeCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await removeCartItemRecord(uid, req.params.productId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove cart item";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await clearCartRecord(uid);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear cart";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
