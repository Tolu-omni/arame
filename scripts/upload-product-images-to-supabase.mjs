#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUCKET = "product-images";
const rootDir = fileURLToPath(new URL("../", import.meta.url));

async function loadEnvFile(fileName) {
  try {
    const envFile = await readFile(join(rootDir, fileName), "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...valueParts] = trimmed.split("=");
      const key = rawKey.trim();
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional local env file.
  }
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "",
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : "",
  ].filter(Boolean);

  console.error(`Missing ${missing.join(" and ")}.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

function safeSlug(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFromContentType(contentType) {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  return ".jpg";
}

function isSupabaseProductImage(imagePath) {
  return imagePath.includes("/storage/v1/object/public/product-images/");
}

async function ensureBucket() {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw error;
  }

  if (error) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
      public: true,
    });

    if (updateError) {
      throw updateError;
    }
  }
}

async function loadImage(imagePath) {
  if (/^https?:\/\//i.test(imagePath)) {
    const response = await fetch(imagePath);

    if (!response.ok) {
      throw new Error(`Unable to download ${imagePath}: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    return {
      body: Buffer.from(arrayBuffer),
      contentType,
      ext: extensionFromContentType(contentType),
    };
  }

  const cleanPath = imagePath.replace(/^\//, "").split("?")[0];
  const absolutePath = join(rootDir, "public", cleanPath.replace(/^public[\\/]/, ""));
  const body = await readFile(absolutePath);
  const ext = extname(cleanPath).toLowerCase() || ".jpg";

  return {
    body,
    contentType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg",
    ext,
  };
}

async function main() {
  await ensureBucket();

  const { data: products, error } = await supabase
    .from("products")
    .select("id,slug,name,image_path")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products || []) {
    const imagePath = product.image_path || "";

    if (!imagePath || isSupabaseProductImage(imagePath)) {
      skipped += 1;
      continue;
    }

    try {
      const image = await loadImage(imagePath);
      const objectPath = `catalog/${safeSlug(product.slug || product.name || product.id)}${image.ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, image.body, {
          cacheControl: "31536000",
          contentType: image.contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("products")
        .update({ image_path: publicUrl })
        .eq("id", product.id);

      if (updateError) {
        throw updateError;
      }

      uploaded += 1;
      console.log(`Uploaded ${product.name}: ${publicUrl}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${product.name}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Done. Uploaded: ${uploaded}. Skipped: ${skipped}. Failed: ${failed}.`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
