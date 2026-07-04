import path from "path";

import {createClient} from "@supabase/supabase-js";

const allowedFolders = new Set([
  "product-images",
  "category-images",
  "blog-images",
]);

const bucketName =
  process.env.SUPABASE_STORAGE_BUCKET || "books-bots-drones-images";

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

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    serviceRoleKey === "PASTE_YOUR_SB_SECRET_KEY_HERE"
  ) {
    throw new Error("Supabase storage environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};

export const uploadImageRecord = async (input: UploadImageInput) => {
  const folder = input.folder?.trim();
  const fileName = input.fileName?.trim();
  const contentType = input.contentType?.trim();
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
    return {
      status: 400,
      body: {
        success: false,
        message: "Invalid storage folder",
      },
    };
  }

  if (!contentType.startsWith("image/")) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Only image uploads are supported",
      },
    };
  }

  const filePath = `${folder}/${Date.now()}-${cleanFileName(fileName)}`;
  const fileBuffer = Buffer.from(cleanBase64(base64), "base64");
  const supabase = getSupabaseClient();

  const {error} = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {data} = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return {
    status: 201,
    body: {
      success: true,
      message: "Image uploaded successfully",
      image: {
        filePath,
        bucket: bucketName,
        downloadUrl: data.publicUrl,
      },
    },
  };
};

export const deleteImageRecord = async (filePath: string) => {
  const targetPath = filePath?.trim();

  if (!targetPath) {
    return {
      status: 400,
      body: {
        success: false,
        message: "filePath is required",
      },
    };
  }

  const supabase = getSupabaseClient();
  const {error} = await supabase.storage.from(bucketName).remove([targetPath]);

  if (error) {
    throw new Error(error.message);
  }

  return {
    status: 200,
    body: {
      success: true,
      message: "Image deleted successfully",
    },
  };
};
