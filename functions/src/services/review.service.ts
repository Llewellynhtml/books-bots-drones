import {db} from "../config/firebase";

const reviewsCollection = db.collection("reviews");
const productsCollection = db.collection("products");

interface ReviewInput {
  productId?: string;
  rating?: number;
  comment?: string;
}

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getRating = (value: unknown) => {
  const rating = Number(value);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return rating;
};

const productExists = async (productId: string) => {
  const productDoc = await productsCollection.doc(productId).get();
  return productDoc.exists;
};

export const createReviewRecord = async (
  uid: string,
  email: string | undefined,
  body: ReviewInput
) => {
  const productId = cleanText(body.productId);
  const comment = cleanText(body.comment);
  const rating = getRating(body.rating);

  if (!productId || !rating || !comment) {
    return {
      status: 400,
      body: {
        success: false,
        message: "productId, rating and comment are required",
      },
    };
  }

  if (!(await productExists(productId))) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found",
      },
    };
  }

  const now = new Date().toISOString();
  const docRef = reviewsCollection.doc();
  const review = {
    id: docRef.id,
    productId,
    uid,
    email: email || "",
    rating,
    comment,
    status: "published",
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(review);

  return {
    status: 201,
    body: {
      success: true,
      message: "Review created successfully",
      review,
    },
  };
};

export const getReviewRecords = async (query: {productId?: string}) => {
  let reviewsQuery: FirebaseFirestore.Query = reviewsCollection;

  if (query.productId) {
    reviewsQuery = reviewsQuery.where("productId", "==", query.productId);
  }

  const snapshot = await reviewsQuery.orderBy("createdAt", "desc").get();
  const reviews = snapshot.docs.map((doc) => doc.data());

  return {
    success: true,
    count: reviews.length,
    reviews,
  };
};

export const deleteReviewRecord = async (
  id: string,
  uid: string,
  role?: string
) => {
  const reviewDoc = reviewsCollection.doc(id);
  const currentReview = await reviewDoc.get();

  if (!currentReview.exists) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Review not found",
      },
    };
  }

  const review = currentReview.data();

  if (role !== "admin" && review?.uid !== uid) {
    return {
      status: 403,
      body: {
        success: false,
        message: "You cannot delete this review",
      },
    };
  }

  await reviewDoc.delete();

  return {
    status: 200,
    body: {
      success: true,
      message: "Review deleted successfully",
    },
  };
};
