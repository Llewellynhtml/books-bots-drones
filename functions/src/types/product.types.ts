export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  stock: number;
  images: string[];
  targetCustomers: string[];
  launchPhase?: number;
  features: string[];
  specs: Record<string, string>;
  isActive: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  stock?: number;
  images?: string[];
  targetCustomers?: string[];
  launchPhase?: number;
  features?: string[];
  specs?: Record<string, string>;
  isActive?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface ProductQuery {
  categoryId?: string;
  brand?: string;
  search?: string;
  isActive?: string;
  launchPhase?: string;
}
