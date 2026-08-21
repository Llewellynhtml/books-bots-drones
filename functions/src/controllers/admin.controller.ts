import {Request, Response} from "express";

import {
  getAdminDashboardRecord,
  getAdminCollectionRecords,
  getAdminOrderRecords,
  getAdminRevenueRecord,
  getAdminUserRecords,
  deleteAdminUserRecord,
  updateAdminUserRoleRecord,
  isAdminCollectionName,
} from "../services/admin.service";
import {AuthRequest} from "../middleware/auth";

const getParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export const getAdminDashboard = async (_req: Request, res: Response) => {
  try {
    const result = await getAdminDashboardRecord();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get dashboard";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getAdminCollection = async (req: Request, res: Response) => {
  try {
    const collectionName = getParam(req.params.collectionName);

    if (!isAdminCollectionName(collectionName)) {
      return res.status(404).json({
        success: false,
        message: "Administrative collection not found",
      });
    }

    const result = await getAdminCollectionRecords(collectionName);
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ?
      error.message : "Failed to get collection records";
    return res.status(500).json({success: false, message});
  }
};

export const getAdminUsers = async (_req: Request, res: Response) => {
  try {
    const result = await getAdminUserRecords();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get users";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getAdminOrders = async (_req: Request, res: Response) => {
  try {
    const result = await getAdminOrderRecords();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get orders";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getAdminRevenue = async (_req: Request, res: Response) => {
  try {
    const result = await getAdminRevenueRecord();
    return res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get revenue";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const updateAdminUserRole = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const actorUid = req.user?.uid;

    if (!actorUid) {
      return res.status(401).json({success: false, message: "Unauthorized"});
    }

    const result = await updateAdminUserRoleRecord(
      getParam(req.params.uid),
      req.body.role,
      actorUid
    );
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user role";
    return res.status(500).json({success: false, message});
  }
};

export const deleteAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const actorUid = req.user?.uid;
    if (!actorUid) return res.status(401).json({success: false, message: "Unauthorized"});
    const result = await deleteAdminUserRecord(getParam(req.params.uid), actorUid);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return res.status(500).json({success: false, message});
  }
};
