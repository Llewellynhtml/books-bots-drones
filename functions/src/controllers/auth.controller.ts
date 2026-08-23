/* eslint-disable max-len */
import {Request, Response} from "express";

import {auth, db} from "../config/firebase";
import {AuthRequest} from "../middleware/auth";

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const cleanEmail = (value: unknown) => cleanText(value).toLowerCase();
const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

const getFirebaseError = (error: unknown, fallback: string) => {
  const firebaseError = error as {code?: string; message?: string};

  if (firebaseError.code === "auth/email-already-exists") {
    return {status: 409, message: "An account with this email already exists"};
  }

  if (
    firebaseError.code === "auth/invalid-email" ||
    firebaseError.code === "auth/invalid-password" ||
    firebaseError.code === "auth/weak-password"
  ) {
    return {status: 400, message: firebaseError.message || fallback};
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : fallback,
  };
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanEmail(req.body.email);
    const password = typeof req.body.password === "string" ?
      req.body.password : "";

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    const userData = {
      uid: userRecord.uid,
      name,
      email,
      role: "customer",
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await db.collection("users").doc(userRecord.uid).set(userData);
    } catch (error) {
      await auth.deleteUser(userRecord.uid).catch(() => undefined);
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    const result = getFirebaseError(error, "Failed to register user");

    return res.status(result.status).json({
      success: false,
      message: result.message,
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = typeof req.body.password === "string" ?
      req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }


    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const apiKey = process.env.WEB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Firebase API key is missing",
      });
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(401).json({
        success: false,
        message: data.error?.message || "Login failed",
      });
    }

    const [userDoc, authUser] = await Promise.all([
      db.collection("users").doc(data.localId).get(),
      auth.getUser(data.localId),
    ]);
    const userData = userDoc.data();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: {...(userData || {
        uid: data.localId,
        email: data.email,
        role: "customer",
      }), emailVerified: authUser.emailVerified},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const refreshToken =
      typeof req.body.refreshToken === "string" ?
        req.body.refreshToken.trim() :
        "";

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const apiKey = process.env.WEB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Firebase API key is missing",
      });
    }

    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      }
    );
    const data = await response.json();

    if (!response.ok) {
      return res.status(401).json({
        success: false,
        message: data.error?.message || "Session refresh failed",
      });
    }

    const userDoc = await db.collection("users").doc(data.user_id).get();
    const userData = userDoc.data();

    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      token: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      user: userData || {
        uid: data.user_id,
        email: "",
        role: "customer",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Session refresh failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = cleanEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const apiKey = process.env.WEB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Firebase API key is missing",
      });
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: data.error?.message || "Failed to send password reset email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ?
        error.message :
        "Failed to send password reset email";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const [userDoc, authUser] = await Promise.all([
      db.collection("users").doc(uid).get(),
      auth.getUser(uid),
    ]);

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {...userDoc.data(), emailVerified: authUser.emailVerified},
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const sendVerificationEmail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.uid) return res.status(401).json({success: false, message: "Unauthorized"});
    if (req.user.emailVerified) return res.status(200).json({success: true, message: "Email is already verified"});
    const apiKey = process.env.WEB_API_KEY;
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey || !idToken) return res.status(500).json({success: false, message: "Email verification is not configured"});
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({requestType: "VERIFY_EMAIL", idToken}),
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({success: false, message: data.error?.message || "Failed to send verification email"});
    return res.json({success: true, message: "Verification email sent"});
  } catch (error) {
    return res.status(500).json({success: false, message: error instanceof Error ? error.message : "Failed to send verification email"});
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
    const name = cleanText(req.body.name);
    const phone = cleanText(req.body.phone);
    if (!name) return res.status(400).json({success: false, message: "Name is required"});
    if (phone && !/^\+?[0-9 ()-]{9,20}$/.test(phone)) {
      return res.status(400).json({success: false, message: "Enter a valid phone number"});
    }
    await Promise.all([
      auth.updateUser(uid, {displayName: name}),
      db.collection("users").doc(uid).set({name, phone, updatedAt: new Date().toISOString()}, {merge: true}),
    ]);
    const profile = await db.collection("users").doc(uid).get();
    return res.status(200).json({success: true, message: "Profile updated", user: profile.data()});
  } catch (error) {
    return res.status(500).json({success: false, message: error instanceof Error ? error.message : "Failed to update profile"});
  }
};

const addressPayload = (body: Record<string, unknown>) => ({
  label: cleanText(body.label) || "Delivery address",
  fullName: cleanText(body.fullName), phone: cleanText(body.phone),
  addressLine1: cleanText(body.addressLine1), addressLine2: cleanText(body.addressLine2),
  city: cleanText(body.city), province: cleanText(body.province),
  postalCode: cleanText(body.postalCode), country: cleanText(body.country) || "South Africa",
});

export const getAddresses = async (req: AuthRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
  const snapshot = await db.collection("users").doc(uid).collection("addresses").orderBy("updatedAt", "desc").get();
  return res.json({success: true, addresses: snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))});
};

export const createAddress = async (req: AuthRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
  const address = addressPayload(req.body);
  if (!address.fullName || !address.phone || !address.addressLine1 || !address.city || !address.province || !/^\d{4}$/.test(address.postalCode)) {
    return res.status(400).json({success: false, message: "Complete delivery address is required"});
  }
  const now = new Date().toISOString();
  const ref = db.collection("users").doc(uid).collection("addresses").doc();
  await ref.set({...address, createdAt: now, updatedAt: now});
  return res.status(201).json({success: true, address: {id: ref.id, ...address, createdAt: now, updatedAt: now}});
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
  const address = addressPayload(req.body);
  if (!address.fullName || !address.phone || !address.addressLine1 || !address.city || !address.province || !/^\d{4}$/.test(address.postalCode)) {
    return res.status(400).json({success: false, message: "Complete delivery address is required"});
  }
  const ref = db.collection("users").doc(uid).collection("addresses").doc(req.params.id as string);
  if (!(await ref.get()).exists) return res.status(404).json({success: false, message: "Address not found"});
  await ref.update({...address, updatedAt: new Date().toISOString()});
  return res.json({success: true, message: "Address updated"});
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({success: false, message: "Unauthorized"});
  await db.collection("users").doc(uid).collection("addresses").doc(req.params.id as string).delete();
  return res.json({success: true, message: "Address deleted"});
};
