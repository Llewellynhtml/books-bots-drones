import {Request, Response} from "express";

import {
  createContactMessageRecord,
  getContactMessageRecordById,
  getContactMessageRecords,
  updateContactMessageStatusRecord,
} from "../services/contact.service";

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createContactMessage = async (req: Request, res: Response) => {
  try {
    const result = await createContactMessageRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ?
        error.message :
        "Failed to submit contact message";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getContactMessages = async (_req: Request, res: Response) => {
  try {
    const result = await getContactMessageRecords();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get contact messages";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getContactMessageById = async (req: Request, res: Response) => {
  try {
    const result = await getContactMessageRecordById(getParam(req.params.id));
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get contact message";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateContactMessageStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await updateContactMessageStatusRecord(
      getParam(req.params.id),
      req.body.status
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ?
        error.message :
        "Failed to update contact message";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
