import {Response} from "express";

import {AuthRequest} from "../middleware/auth";
import {
  createNotificationRecord,
  deleteNotificationRecord,
  getNotificationRecords,
  markNotificationReadRecord,
} from "../services/notification.service";

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const result = await createNotificationRecord(req.body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create notification";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await getNotificationRecords(uid, req.user?.role);
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get notifications";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await markNotificationReadRecord(
      getParam(req.params.id),
      uid,
      req.user?.role
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notification";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await deleteNotificationRecord(
      getParam(req.params.id),
      uid,
      req.user?.role
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete notification";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
