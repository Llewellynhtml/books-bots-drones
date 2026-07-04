import {db} from "../config/firebase";
import {ProductInput, ProductQuery} from "../types/product.types";

const productsCollection = db.collection("products");
const categoriesCollection = db.collection("categories");

const createSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toSpecs = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>(
    (specs, [key, specValue]) => {
      if (typeof specValue === "string") {
        specs[key] = specValue;
      }

      return specs;
    },
    {}
  );
};

const cleanProductInput = (body: ProductInput) => {
  const name = body.name?.trim();
  const description = body.description?.trim();
  const price = Number(body.price);
  const categoryId = body.categoryId?.trim();

  if (!name || !description || !categoryId || !Number.isFinite(price)) {
    return null;
  }

  return {
    name,
    slug: createSlug(name),
    description,
    price,
    categoryId,
    categoryName: body.categoryName?.trim() || "",
    subcategory: body.subcategory?.trim() || "",
    brand: body.brand?.trim() || "",
    stock: Number.isFinite(Number(body.stock)) ? Number(body.stock) : 0,
    images: toStringArray(body.images),
    targetCustomers: toStringArray(body.targetCustomers),
    launchPhase: Number.isFinite(Number(body.launchPhase)) ?
      Number(body.launchPhase) :
      null,
    features: toStringArray(body.features),
    specs: toSpecs(body.specs),
    isActive: body.isActive ?? true,
    isNew: body.isNew ?? false,
    isBestSeller: body.isBestSeller ?? false,
  };
};

const categoryExists = async (categoryId: string) => {
  const categoryDoc = await categoriesCollection.doc(categoryId).get();
  return categoryDoc.exists;
};

export const createProductRecord = async (body: ProductInput) => {
  const productInput = cleanProductInput(body);

  if (!productInput) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Name, description, price and categoryId are required",
      },
    };
  }

  if (productInput.price < 0 || productInput.stock < 0) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Price and stock cannot be negative",
      },
    };
  }

  if (!(await categoryExists(productInput.categoryId))) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Category does not exist",
      },
    };
  }

  const existing = await productsCollection
    .where("slug", "==", productInput.slug)
    .limit(1)
    .get();

  if (!existing.empty) {
    return {
      status: 409,
      body: {
        success: false,
        message: "Product already exists",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = productsCollection.doc();
  const product = {
    id: docRef.id,
    ...productInput,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(product);

  return {
    status: 201,
    body: {
      success: true,
      message: "Product created successfully",
      product,
    },
  };
};

export const getProductRecords = async (query: ProductQuery) => {
  let productsQuery: FirebaseFirestore.Query = productsCollection;

  if (query.categoryId) {
    productsQuery = productsQuery.where("categoryId", "==", query.categoryId);
  }

  if (query.brand) {
    productsQuery = productsQuery.where("brand", "==", query.brand);
  }

  if (query.launchPhase) {
    productsQuery = productsQuery.where(
      "launchPhase",
      "==",
      Number(query.launchPhase)
    );
  }

  if (query.isActive === "true" || query.isActive === "false") {
    productsQuery = productsQuery.where("isActive", "==", query.isActive === "true");
  }

  const snapshot = await productsQuery.orderBy("name", "asc").get();
  let products = snapshot.docs.map((doc) => doc.data());

  if (query.search) {
    const search = query.search.toLowerCase();
    products = products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const description = String(product.description || "").toLowerCase();
      const brand = String(product.brand || "").toLowerCase();
      const subcategory = String(product.subcategory || "").toLowerCase();

      return (
        name.includes(search) ||
        description.includes(search) ||
        brand.includes(search) ||
        subcategory.includes(search)
      );
    });
  }

  return {
    success: true,
    count: products.length,
    products,
  };
};

export const getProductRecordById = async (id: string) => {
  const productDoc = await productsCollection.doc(id).get();

  if (!productDoc.exists) {
    return null;
  }

  return productDoc.data();
};

export const updateProductRecord = async (
  id: string,
  body: Partial<ProductInput>
) => {
  const productDoc = productsCollection.doc(id);
  const currentProduct = await productDoc.get();

  if (!currentProduct.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found",
      },
    };
  }

  const updateData: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();

    if (!name) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Product name cannot be empty",
        },
      };
    }

    updateData.name = name;
    updateData.slug = createSlug(name);
  }

  if (typeof body.description === "string") {
    updateData.description = body.description.trim();
  }

  if (body.price !== undefined) {
    const price = Number(body.price);

    if (!Number.isFinite(price) || price < 0) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Price must be a positive number",
        },
      };
    }

    updateData.price = price;
  }

  if (typeof body.categoryId === "string") {
    const categoryId = body.categoryId.trim();

    if (!(await categoryExists(categoryId))) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Category does not exist",
        },
      };
    }

    updateData.categoryId = categoryId;
  }

  if (typeof body.categoryName === "string") {
    updateData.categoryName = body.categoryName.trim();
  }

  if (typeof body.subcategory === "string") {
    updateData.subcategory = body.subcategory.trim();
  }

  if (typeof body.brand === "string") {
    updateData.brand = body.brand.trim();
  }

  if (body.stock !== undefined) {
    const stock = Number(body.stock);

    if (!Number.isFinite(stock) || stock < 0) {
      return {
        status: 400,
        body: {
          success: false,
          message: "Stock must be a positive number",
        },
      };
    }

    updateData.stock = stock;
  }

  if (body.images !== undefined) {
    updateData.images = toStringArray(body.images);
  }

  if (body.targetCustomers !== undefined) {
    updateData.targetCustomers = toStringArray(body.targetCustomers);
  }

  if (body.launchPhase !== undefined) {
    const launchPhase = Number(body.launchPhase);
    updateData.launchPhase = Number.isFinite(launchPhase) ? launchPhase : null;
  }

  if (body.features !== undefined) {
    updateData.features = toStringArray(body.features);
  }

  if (body.specs !== undefined) {
    updateData.specs = toSpecs(body.specs);
  }

  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }

  if (typeof body.isNew === "boolean") {
    updateData.isNew = body.isNew;
  }

  if (typeof body.isBestSeller === "boolean") {
    updateData.isBestSeller = body.isBestSeller;
  }

  updateData.updatedAt = new Date().toISOString();

  await productDoc.update(updateData);

  const updatedProduct = await productDoc.get();

  return {
    status: 200,
    body: {
      success: true,
      message: "Product updated successfully",
      product: updatedProduct.data(),
    },
  };
};

export const deleteProductRecord = async (id: string) => {
  const productDoc = productsCollection.doc(id);
  const currentProduct = await productDoc.get();

  if (!currentProduct.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found",
      },
    };
  }

  await productDoc.delete();

  return {
    status: 200,
    body: {
      success: true,
      message: "Product deleted successfully",
    },
  };
};
