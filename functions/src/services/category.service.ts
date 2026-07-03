import {db} from "../config/firebase";
import {CategoryInput} from "../types/category.types";

const categoriesCollection = db.collection("categories");

const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const cleanCategoryInput = (body: CategoryInput) => {
  const name = body.name?.trim();

  if (!name) {
    return null;
  }

  return {
    name,
    slug: createSlug(name),
    description: body.description?.trim() || "",
    imageUrl: body.imageUrl?.trim() || "",
    isActive: body.isActive ?? true,
  };
};

export const createCategoryRecord = async (body: CategoryInput) => {
  const categoryInput = cleanCategoryInput(body);

  if (!categoryInput) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Category name is required",
      },
    };
  }

  const existing = await categoriesCollection
    .where("slug", "==", categoryInput.slug)
    .limit(1)
    .get();

  if (!existing.empty) {
    return {
      status: 409,
      body: {
        success: false,
        message: "Category already exists",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = categoriesCollection.doc();
  const category = {
    id: docRef.id,
    ...categoryInput,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(category);

  return {
    status: 201,
    body: {
      success: true,
      message: "Category created successfully",
      category,
    },
  };
};

export const getCategoryRecords = async () => {
  const snapshot = await categoriesCollection.orderBy("name", "asc").get();
  const categories = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: categories.length,
    categories,
  };
};

export const getCategoryRecordById = async (id: string) => {
  const categoryDoc = await categoriesCollection.doc(id).get();

  if (!categoryDoc.exists) {
    return null;
  }

  return categoryDoc.data();
};

export const updateCategoryRecord = async (
  id: string,
  body: Partial<CategoryInput>
) => {
  const categoryDoc = categoriesCollection.doc(id);
  const currentCategory = await categoryDoc.get();

  if (!currentCategory.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Category not found",
      },
    };
  }

  const updateData: Partial<CategoryInput> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();

    if (!name) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Category name cannot be empty",
        },
      };
    }

    updateData.name = name;
  }

  if (typeof body.description === "string") {
    updateData.description = body.description.trim();
  }

  if (typeof body.imageUrl === "string") {
    updateData.imageUrl = body.imageUrl.trim();
  }

  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }

  const categoryUpdate = {
    ...updateData,
    ...(updateData.name ? {slug: createSlug(updateData.name)} : {}),
    updatedAt: new Date().toISOString(),
  };

  await categoryDoc.update(categoryUpdate);

  const updatedCategory = await categoryDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Category updated successfully",
      category: updatedCategory.data(),
    },
  };
};

export const deleteCategoryRecord = async (id: string) => {
  const categoryDoc = categoriesCollection.doc(id);
  const currentCategory = await categoryDoc.get();

  if (!currentCategory.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Category not found",
      },
    };
  }

  await categoryDoc.delete();

  return {
    status: 200,
    body: {
      success: true,
      message: "Category deleted successfully",
    },
  };
};
