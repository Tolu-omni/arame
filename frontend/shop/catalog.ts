import type { CatalogItem, Filter } from "./types";

export const catalog: Record<string, CatalogItem> = {
  "All Products": {
    title: "All Products",
    banner: "/images/shop/banner-all-products.jpg",
    description: "",
  },
  "Women's Perfumes": {
    title: "Women's Perfumes",
    banner: "/images/shop/banner-womens-perfumes.jpg",
    description: "Elegant, soft and luminous fragrances for every moment.",
  },
  "Men's Perfumes": {
    title: "Men's Perfumes",
    banner: "/images/shop/banner-mens-perfumes.jpg",
    description: "Bold, refined and deep compositions with character.",
  },
  "Body Oils": {
    title: "Body Oils",
    banner: "/images/shop/banner-body-oils.jpg",
    description: "Nourishing body oils that leave a smooth scented finish.",
  },
};

export const sortOptions = [
  "Recommended",
  "Price (low to high)",
  "Price (high to low)",
  "Name A-Z",
];

export const categoryFilters: Record<string, Filter[]> = {
  "All Products": [
    { title: "Price", defaultOpen: false, type: "range", min: "NGN 50", max: "NGN 180" },
    { title: "Concentration", defaultOpen: false, type: "options", options: ["Eau de Parfum", "Eau de Toilette", "Parfum"] },
    { title: "Scent", defaultOpen: false, type: "options", options: ["Jasmine", "Lavender", "Rosehip", "Sandalwood", "Vanilla"] },
    { title: "Scent Profile", defaultOpen: false, type: "options", options: ["Jasmine", "Rose"] },
    { title: "Size", defaultOpen: false, type: "options", options: ["100ml", "200ml"] },
  ],
  "Men's Perfumes": [
    { title: "Price", defaultOpen: true, type: "range", min: "NGN 80", max: "NGN 180" },
    { title: "Concentration", defaultOpen: true, type: "options", options: ["Eau de Parfum", "Eau de Toilette", "Parfum"] },
    { title: "Scent", defaultOpen: false, type: "options", options: ["Jasmine", "Lavender", "Rosehip", "Sandalwood", "Vanilla"] },
    { title: "Scent Profile", defaultOpen: false, type: "options", options: ["Jasmine", "Rose"] },
    { title: "Size", defaultOpen: true, type: "options", options: ["100ml", "200ml"] },
  ],
  "Body Oils": [
    { title: "Price", defaultOpen: true, type: "range", min: "NGN 50", max: "NGN 72" },
    { title: "Concentration", defaultOpen: false, type: "options", options: ["Eau de Parfum", "Eau de Toilette", "Parfum"] },
    { title: "Scent", defaultOpen: true, type: "options", options: ["Jasmine", "Lavender", "Rosehip", "Sandalwood", "Vanilla"] },
    { title: "Scent Profile", defaultOpen: false, type: "options", options: ["Jasmine", "Rose"] },
    { title: "Size", defaultOpen: true, type: "options", options: ["100ml", "200ml"] },
  ],
  "Women's Perfumes": [
    { title: "Price", defaultOpen: true, type: "range", min: "NGN 75", max: "NGN 165" },
    { title: "Concentration", defaultOpen: false, type: "options", options: ["Eau de Parfum", "Eau de Toilette", "Parfum"] },
    { title: "Scent", defaultOpen: false, type: "options", options: ["Jasmine", "Lavender", "Rosehip", "Sandalwood", "Vanilla"] },
    { title: "Scent Profile", defaultOpen: true, type: "options", options: ["Jasmine", "Rose"] },
    { title: "Size", defaultOpen: true, type: "options", options: ["100ml", "200ml"] },
  ],
};
