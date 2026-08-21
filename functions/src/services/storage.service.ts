import {randomUUID} from "crypto";
import path from "path";

import {storage} from "../config/firebase";

const allowedFolders = new Set(["product-images", "category-images"]);
const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const maximumImageSize = 5 * 1024 * 1024;

export interface UploadImageInput {
  folder: string;
  fileName: string;
  contentType: string;
  base64: string;
}

const cleanBase64 = (value: string) => {
  const [, payload] = value.split(",");
  return (payload || value).replace(/\s/g, "");
};

const cleanFileName = (fileName: string) => {
  const parsed = path.parse(fileName.trim());
  const safeName = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const safeExt = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${safeName || "image"}${safeExt}`;
};

const getBucket = () => {
  const bucketName = process.env.APP_STORAGE_BUCKET?.trim();
  if (!bucketName) {
    throw new Error("APP_STORAGE_BUCKET is not configured");
  }
  return storage.bucket(bucketName);
};

const isAllowedFilePath = (filePath: string) => {
  if (filePath.includes("..") || filePath.startsWith("/") || filePath.includes("\\")) {
    return false;
  }
  const [folder, fileName, ...extra] = filePath.split("/");
  return allowedFolders.has(folder) && Boolean(fileName) && extra.length === 0;
};

export const uploadImageRecord = async (input: UploadImageInput) => {
  const folder = input.folder?.trim();
  const fileName = input.fileName?.trim();
  const contentType = input.contentType?.trim().toLowerCase();
  const base64 = input.base64?.trim();

  if (!folder || !fileName || !contentType || !base64) {
    return {
      status: 400,
      body: {
        success: false,
        message: "folder, fileName, contentType and base64 are required",
      },
    };
  }

  if (!allowedFolders.has(folder)) {
    return {status: 400, body: {success: false, message: "Invalid storage folder"}};
  }

  if (!allowedContentTypes.has(contentType)) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Only JPEG, PNG, WebP and AVIF images are supported",
      },
    };
  }

  const fileBuffer = Buffer.from(cleanBase64(base64), "base64");
  if (!fileBuffer.length) {
    return {status: 400, body: {success: false, message: "Image data is invalid"}};
  }
  if (fileBuffer.length > maximumImageSize) {
    return {
      status: 413,
      body: {success: false, message: "Images must be 5 MB or smaller"},
    };
  }

  const filePath = `${folder}/${Date.now()}-${cleanFileName(fileName)}`;
  const downloadToken = randomUUID();
  const bucket = getBucket();
  const file = bucket.file(filePath);

  await file.save(fileBuffer, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType,
      cacheControl: "public,max-age=31536000,immutable",
      metadata: {firebaseStorageDownloadTokens: downloadToken},
    },
  });

  const downloadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}` +
    `/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

  return {
    status: 201,
    body: {
      success: true,
      message: "Image uploaded successfully",
      image: {filePath, bucket: bucket.name, downloadUrl},
    },
  };
};

export const deleteImageRecord = async (filePath: string) => {
  const targetPath = filePath?.trim();
  if (!targetPath) {
    return {status: 400, body: {success: false, message: "filePath is required"}};
  }
  if (!isAllowedFilePath(targetPath)) {
    return {status: 400, body: {success: false, message: "Invalid image file path"}};
  }

  await getBucket().file(targetPath).delete({ignoreNotFound: true});
  return {
    status: 200,
    body: {success: true, message: "Image deleted successfully"},
  };
};
