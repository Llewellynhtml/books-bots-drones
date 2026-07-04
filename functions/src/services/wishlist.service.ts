import {db} from "../config/firebase";
import {getProductRecordById} from "./product.service";

const wishlistsCollection = db.collection("wishlists");

interface WishlistItem {
  productId: string;
  addedAt: string;
}

const getWishlistDoc = (uid: string) => wishlistsCollection.doc(uid);

const getWishlistItems = async (uid: string): Promise<WishlistItem[]> => {
  const wishlistDoc = await getWishlistDoc(uid).get();
  const data = wishlistDoc.data();
  const items = data?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(
    (item): item is WishlistItem =>
      typeof item?.productId === "string" &&
      typeof item?.addedAt === "string"
  );
};

const buildWishlistResponse = async (uid: string) => {
  const items = await getWishlistItems(uid);
  const products = await Promise.all(
    items.map(async (item) => {
      const product = await getProductRecordById(item.productId);

      if (!product) {
        return null;
      }

      return {
        addedAt: item.addedAt,
        product,
      };
    })
  );

  const wishlist = products.filter(Boolean);

  return {
    success: true,
    count: wishlist.length,
    wishlist,
  };
};

export const getWishlistRecord = async (uid: string) => {
  return buildWishlistResponse(uid);
};

export const addWishlistItemRecord = async (
  uid: string,
  productIdInput: unknown
) => {
  const productId = typeof productIdInput === "string" ?
    productIdInput.trim() :
    "";

  if (!productId) {
    return {
      status: 400,
      body: {
        success: false,
        message: "productId is required",
      },
    };
  }

  const product = await getProductRecordById(productId);

  if (!product) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found",
      },
    };
  }

  const wishlistDoc = getWishlistDoc(uid);
  const items = await getWishlistItems(uid);

  if (items.some((item) => item.productId === productId)) {
    return {
      status: 409,
      body: {
        success: false,
        message: "Product already exists in wishlist",
      },
    };
  }

  const now = new Date().toISOString();
  const wishlist = {
    uid,
    items: [
      ...items,
      {
        productId,
        addedAt: now,
      },
    ],
    updatedAt: now,
  };

  await wishlistDoc.set(wishlist, {merge: true});

  return {
    status: 201,
    body: {
      success: true,
      message: "Product added to wishlist successfully",
      wishlist: await buildWishlistResponse(uid),
    },
  };
};

export const removeWishlistItemRecord = async (
  uid: string,
  productIdInput: unknown
) => {
  const productId = typeof productIdInput === "string" ?
    productIdInput.trim() :
    "";

  if (!productId) {
    return {
      status: 400,
      body: {
        success: false,
        message: "productId is required",
      },
    };
  }

  const wishlistDoc = getWishlistDoc(uid);
  const items = await getWishlistItems(uid);
  const nextItems = items.filter((item) => item.productId !== productId);

  if (nextItems.length === items.length) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found in wishlist",
      },
    };
  }

  await wishlistDoc.set(
    {
      uid,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    },
    {merge: true}
  );

  return {
    status: 200,
    body: {
      success: true,
      message: "Product removed from wishlist successfully",
      wishlist: await buildWishlistResponse(uid),
    },
  };
};
