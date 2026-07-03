export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}
