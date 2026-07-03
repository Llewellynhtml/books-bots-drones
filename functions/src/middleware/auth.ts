import {Request, Response, NextFunction} from "express";
import {auth, db} from "../config/firebase";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role || "customer",
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  return next();
};
