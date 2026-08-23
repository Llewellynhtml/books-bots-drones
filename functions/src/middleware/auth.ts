import {Request, Response, NextFunction} from "express";
import {auth, db} from "../config/firebase";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    emailVerified?: boolean;
  };
}

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  return authorizationHeader
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();
};

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req.headers.authorization);

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
      emailVerified: decodedToken.email_verified === true,
    };

    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown auth error";

    console.error("Auth token verification failed:", message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: process.env.NODE_ENV === "production" ? undefined : message,
    });
  }
};

export const requireVerifiedEmail = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      success: false,
      message: "Verify your email address before completing this action",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  return next();
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
