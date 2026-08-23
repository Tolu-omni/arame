export type ProductModel = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_path: string;
  description: string | null;
  category: string;
  sizes: string[];
  category_tags: string[];
  concentration_tags: string[];
  scent_tags: string[];
  scent_profile_tags: string[];
  size_tags: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
