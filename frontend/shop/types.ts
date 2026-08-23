export type Product = {
  id: number | string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  sizes: string[];
  categoryTags: string[];
  concentrationTags: string[];
  scentTags: string[];
  scentProfileTags: string[];
  sizeTags: string[];
};

export type Filter =
  | {
      title: string;
      defaultOpen: boolean;
      type: "options";
      options: string[];
    }
  | {
      title: string;
      defaultOpen: boolean;
      type: "range";
      min: string;
      max: string;
    };

export type CatalogItem = {
  title: string;
  banner: string;
  description: string;
};
