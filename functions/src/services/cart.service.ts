import {db} from "../config/firebase";
import {CartItem, CartItemWithProduct, CartProduct} from "../types/cart.types";
import {getProductRecordById} from "./product.service";

const cartsCollection = db.collection("carts");

const getCartDoc = (uid: string) => cartsCollection.doc(uid);

const getCartItems = async (uid: string): Promise<CartItem[]> => {
  const cartDoc = await getCartDoc(uid).get();
  const data = cartDoc.data();
  const items = data?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(
    (item): item is CartItem =>
      typeof item?.productId === "string" &&
      typeof item?.quantity === "number" &&
      typeof item?.addedAt === "string" &&
      typeof item?.updatedAt === "string"
  );
};

const toPositiveQuantity = (value: unknown) => {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return null;
  }

  return quantity;
};

const getProductPrice = (product: CartProduct) => {
  const price = Number(product.price);
  return Number.isFinite(price) ? price : 0;
};

const getProductStock = (product: CartProduct) => {
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? stock : null;
};

const buildCartResponse = async (uid: string) => {
  const items = await getCartItems(uid);
  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      const product = await getProductRecordById(item.productId);

      if (!product) {
        return null;
      }

      const cartProduct = product as CartProduct;

      return {
        ...item,
        product: cartProduct,
        lineTotal: getProductPrice(cartProduct) * item.quantity,
      };
    })
  );

  const cartItems = resolvedItems.filter(
    (item): item is CartItemWithProduct => Boolean(item)
  );
  const totalQuantity = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const subtotal = cartItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  );

  return {
    success: true,
    count: cartItems.length,
    totalQuantity,
    subtotal,
    cart: cartItems,
  };
};

export const getCartRecord = async (uid: string) => {
  return buildCartResponse(uid);
};

export const addCartItemRecord = async (
  uid: string,
  productIdInput: unknown,
  quantityInput: unknown
) => {
  const productId = typeof productIdInput === "string" ?
    productIdInput.trim() :
    "";
  const quantity = toPositiveQuantity(quantityInput ?? 1);

  if (!productId || !quantity) {
    return {
      status: 400,
      body: {
        success: false,
        message: "productId and quantity are required",
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

  const stock = getProductStock(product as CartProduct);

  if (stock !== null && quantity > stock) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Requested quantity exceeds product stock",
      },
    };
  }

  const now = new Date().toISOString();
  const cartDoc = getCartDoc(uid);
  const items = await getCartItems(uid);
  const existingItem = items.find((item) => item.productId === productId);
  const nextItems = existingItem ?
    items.map((item) => {
      if (item.productId !== productId) {
        return item;
      }

      return {
        ...item,
        quantity: item.quantity + quantity,
        updatedAt: now,
      };
    }) :
    [
      ...items,
      {
        productId,
        quantity,
        addedAt: now,
        updatedAt: now,
      },
    ];

  const nextQuantity =
    nextItems.find((item) => item.productId === productId)?.quantity || 0;

  if (stock !== null && nextQuantity > stock) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Cart quantity exceeds product stock",
      },
    };
  }

  await cartDoc.set(
    {
      uid,
      items: nextItems,
      updatedAt: now,
    },
    {merge: true}
  );

  return {
    status: 201,
    body: {
      success: true,
      message: "Product added to cart successfully",
      cart: await buildCartResponse(uid),
    },
  };
};

export const updateCartItemRecord = async (
  uid: string,
  productIdInput: unknown,
  quantityInput: unknown
) => {
  const productId = typeof productIdInput === "string" ?
    productIdInput.trim() :
    "";
  const quantity = toPositiveQuantity(quantityInput);

  if (!productId || !quantity) {
    return {
      status: 400,
      body: {
        success: false,
        message: "productId and quantity are required",
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

  const stock = getProductStock(product as CartProduct);

  if (stock !== null && quantity > stock) {
    return {
      status: 400,
      body: {
        success: false,
        message: "Requested quantity exceeds product stock",
      },
    };
  }

  const items = await getCartItems(uid);

  if (!items.some((item) => item.productId === productId)) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found in cart",
      },
    };
  }

  const now = new Date().toISOString();
  const nextItems = items.map((item) => {
    if (item.productId !== productId) {
      return item;
    }

    return {
      ...item,
      quantity,
      updatedAt: now,
    };
  });

  await getCartDoc(uid).set(
    {
      uid,
      items: nextItems,
      updatedAt: now,
    },
    {merge: true}
  );

  return {
    status: 200,
    body: {
      success: true,
      message: "Cart item updated successfully",
      cart: await buildCartResponse(uid),
    },
  };
};

export const removeCartItemRecord = async (
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

  const items = await getCartItems(uid);
  const nextItems = items.filter((item) => item.productId !== productId);

  if (nextItems.length === items.length) {
    return {
      status: 404,
      body: {
        success: false,
        message: "Product not found in cart",
      },
    };
  }

  await getCartDoc(uid).set(
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
      message: "Product removed from cart successfully",
      cart: await buildCartResponse(uid),
    },
  };
};

export const clearCartRecord = async (uid: string) => {
  await getCartDoc(uid).set(
    {
      uid,
      items: [],
      updatedAt: new Date().toISOString(),
    },
    {merge: true}
  );

  return {
    status: 200,
    body: {
      success: true,
      message: "Cart cleared successfully",
      cart: await buildCartResponse(uid),
    },
  };
};

interface PurchasedCartItem {
  productId: string;
  quantity: number;
}

/**
 * Removes only the quantities captured by an order and records completion on
 * the order. This makes payment verification safe to retry while preserving
 * products the customer added after leaving for the payment provider.
 * @param {string} uid Firebase user ID that owns the cart.
 * @param {string} orderId Order being finalized.
 * @param {PurchasedCartItem[]} purchasedItems Quantities captured by the order.
 * @return {Promise<void>} Resolves after the transactional update.
 */
export const finalizePaidOrderCartRecord = async (
  uid: string,
  orderId: string,
  purchasedItems: PurchasedCartItem[]
) => {
  const orderRef = db.collection("orders").doc(orderId);
  const cartRef = getCartDoc(uid);

  await db.runTransaction(async (transaction) => {
    const [orderSnapshot, cartSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(cartRef),
    ]);

    if (!orderSnapshot.exists || orderSnapshot.data()?.cartFinalizedAt) {
      return;
    }

    const cartData = cartSnapshot.data();
    const currentItems = Array.isArray(cartData?.items) ?
      cartData.items as CartItem[] :
      [];
    const purchasedByProduct = new Map(
      purchasedItems.map((item) => [item.productId, item.quantity])
    );
    const now = new Date().toISOString();
    const nextItems = currentItems.flatMap((item) => {
      const remainingQuantity =
        item.quantity - (purchasedByProduct.get(item.productId) || 0);

      return remainingQuantity > 0 ?
        [{...item, quantity: remainingQuantity, updatedAt: now}] :
        [];
    });

    transaction.set(cartRef, {uid, items: nextItems, updatedAt: now}, {merge: true});
    transaction.update(orderRef, {cartFinalizedAt: now, updatedAt: now});
  });
};
