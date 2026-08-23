/* eslint-disable max-len */
import {Response} from "express";
import {AuthRequest} from "../middleware/auth";
import {deletePromotionRecord, getPromotionRecords, savePromotionRecord, validatePromotionRecord} from "../services/promotion.service";

export const validatePromotion = async (req: AuthRequest, res: Response) => {
  try {
    const result = await validatePromotionRecord(req.body.code, Number(req.body.subtotal));
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ?
        error.message : "Promotion validation failed",
    });
  }
};
export const createPromotion = async (req: AuthRequest, res: Response) => {
  const result = await savePromotionRecord(undefined, req.body); return res.status(result.status).json(result.body);
};
export const updatePromotion = async (req: AuthRequest, res: Response) => {
  const result = await savePromotionRecord(req.params.id as string, req.body); return res.status(result.status).json(result.body);
};
export const deletePromotion = async (req: AuthRequest, res: Response) => res.json(await deletePromotionRecord(req.params.id as string));
export const getPromotions = async (_req: AuthRequest, res: Response) => res.json(await getPromotionRecords());
