/* eslint-disable max-len */
import {db} from "../config/firebase";

const promotions = db.collection("promotions");
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export const getPromotionRecords = async () => {
  const snapshot = await promotions.get();
  const records = snapshot.docs.map((doc) =>
    ({id: doc.id, ...doc.data()} as Record<string, unknown>))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return {success: true, count: records.length, promotions: records};
};

export const validatePromotionRecord = async (codeInput: unknown, subtotal: number) => {
  const code = clean(codeInput).toUpperCase();
  if (!code) return {status: 400, body: {success: false, message: "Promotion code is required"}};
  const snapshot = await promotions.where("code", "==", code).limit(1).get();
  if (snapshot.empty) return {status: 404, body: {success: false, message: "Promotion code is not valid"}};
  const document = snapshot.docs[0];
  const promotion = document.data();
  const now = Date.now();
  if (promotion.active !== true) return {status: 400, body: {success: false, message: "Promotion is inactive"}};
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > now) return {status: 400, body: {success: false, message: "Promotion has not started"}};
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() < now) return {status: 400, body: {success: false, message: "Promotion has expired"}};
  const minimumSpend = Math.max(0, Number(promotion.minimumSpend) || 0);
  if (subtotal < minimumSpend) return {status: 400, body: {success: false, message: `Minimum spend is R${minimumSpend.toFixed(2)}`}};
  const value = Math.max(0, Number(promotion.value) || 0);
  let discountAmount = promotion.type === "percentage" ? subtotal * Math.min(value, 100) / 100 : value;
  discountAmount = Math.min(subtotal, Math.round(discountAmount * 100) / 100);
  return {status: 200, body: {success: true, message: "Promotion applied", promotion: {id: document.id, code, type: promotion.type, value}, discountAmount, finalPrice: subtotal - discountAmount}};
};

export const savePromotionRecord = async (id: string | undefined, input: Record<string, unknown>) => {
  const code = clean(input.code).toUpperCase();
  const type = clean(input.type);
  const value = Number(input.value);
  if (!code || !["percentage", "fixed"].includes(type) || !Number.isFinite(value) || value <= 0) {
    return {status: 400, body: {success: false, message: "Code, valid type and positive value are required"}};
  }
  const ref = id ? promotions.doc(id) : promotions.doc();
  const now = new Date().toISOString();
  const record = {id: ref.id, code, type, value, minimumSpend: Math.max(0, Number(input.minimumSpend) || 0), startsAt: clean(input.startsAt), endsAt: clean(input.endsAt), active: input.active !== false, updatedAt: now};
  await ref.set({...record, ...(id ? {} : {createdAt: now})}, {merge: true});
  return {status: id ? 200 : 201, body: {success: true, promotion: record}};
};

export const deletePromotionRecord = async (id: string) => {
  await promotions.doc(id).delete();
  return {success: true, message: "Promotion deleted"};
};
