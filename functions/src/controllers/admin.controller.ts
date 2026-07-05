import {Request, Response} from "express";

import {
  getAdminDashboardRecord,
  getAdminOrderRecords,
  getAdminRevenueRecord,
  getAdminUserRecords,
} from "../services/admin.service";

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
