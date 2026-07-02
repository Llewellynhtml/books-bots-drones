import {Request, Response} from "express";

import {auth, db} from "../config/firebase";
import {AuthRequest} from "../middleware/auth";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
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
      createdAt: new Date().toISOString(),
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register user";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
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

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: {
        uid: data.localId,
        email: data.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";

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

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: userDoc.data(),
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
