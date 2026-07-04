import {Request, Response} from "express";

import {
  deleteImageRecord,
  uploadImageRecord,
} from "../services/storage.service";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const result = await uploadImageRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload image";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const result = await deleteImageRecord(req.body.filePath);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete image";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
