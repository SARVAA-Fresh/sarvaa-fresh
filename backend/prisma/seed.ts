import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ts-node ESM interop can yield different shapes for imported CommonJS modules.
// Resolve a reliable `hash` function reference for both CJS and ESM interop.
const _bcryptAny: any = bcrypt as any;
const hashFn: (s: string, saltOrRounds: number) => Promise<string> =
  _bcryptAny.hash ?? _bcryptAny.default?.hash ?? (async (s: string, r: number) => {
    // Fallback: try sync hash in case only sync API is available
    const syncHash = _bcryptAny.hashSync ?? _bcryptAny.default?.hashSync;
    if (syncHash) return Promise.resolve(syncHash(s, r));
    throw new Error('bcrypt.hash function not available');
  });

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

interface CategorySeed {
  name: string;
  slug: string;
  description: string;
}

interface ProductSeed {
  name: string;
  slug: string;
  sku: string;
  variantName: string;
  unit: string;
  weight: number;
  price: number;
  mrp: number;
}

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: 'Vegetables',
    slug: 'vegetables',
    description: 'Fresh farm-picked vegetables delivered daily.',
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Hand-picked seasonal fruits sourced from trusted farms.',
  },
];

const PRODUCT_SEEDS_BY_CATEGORY: Record<string, ProductSeed[]> = {
  vegetables: [
    {
      name: 'Fresh Tomato',
      slug: 'fresh-tomato',
      sku: 'SARVAA-VEG-TOMATO-1KG',
      variantName: '1 kg',
      unit: 'kg',
      weight: 1,
      price: 40,
      mrp: 50,
    },
    {
      name: 'Red Onion',
      slug: 'red-onion',
      sku: 'SARVAA-VEG-ONION-1KG',
      variantName: '1 kg',
      unit: 'kg',
      weight: 1,
      price: 35,
      mrp: 45,
    },
  ],
  fruits: [
    {
      name: 'Banana (Robusta)',
      slug: 'banana-robusta',
      sku: 'SARVAA-FRU-BANANA-1DZ',
      variantName: '1 dozen',
      unit: 'pcs',
      weight: 1,
      price: 50,
      mrp: 60,
    },
    {
      name: 'Royal Gala Apple',
      slug: 'royal-gala-apple',
      sku: 'SARVAA-FRU-APPLE-1KG',
      variantName: '1 kg',
      unit: 'kg',
      weight: 1,
      price: 180,
      mrp: 220,
    },
  ],
};

async function seedSuperAdmin(): Promise<void> {
  const email = 'sarvaafresh@gmail.com';
  const passwordHash = await hashFn('Admin@123', SALT_ROUNDS);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      fullName: 'SARVAA Admin',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`Admin seed: SUPER_ADMIN ${admin.email} ready (id=${admin.id}).`);
}

async function seedDemoCustomer(): Promise<void> {
  const mobile = '9876543210';
  const email = 'demo@example.com';

  const existingByMobile = await prisma.user.findUnique({
    where: { mobile },
  });
  if (existingByMobile) {
    console.log(
      `Customer seed: demo customer with mobile ${mobile} already exists, skipping.`,
    );
    return;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    console.log(
      `Customer seed: a user with email ${email} already exists, skipping demo customer creation.`,
    );
    return;
  }

  const passwordHash = await hashFn('Customer@123', SALT_ROUNDS);

  const customer = await prisma.user.create({
    data: {
      fullName: 'Demo Customer',
      mobile,
      email,
      passwordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  console.log(
    `Customer seed: demo customer created with id=${customer.id}, mobile=${customer.mobile}.`,
  );
}

async function seedCategories(): Promise<{ id: string; slug: string }[]> {
  const result: { id: string; slug: string }[] = [];

  for (const seed of CATEGORY_SEEDS) {
    const existing = await prisma.category.findUnique({
      where: { slug: seed.slug },
    });
    if (existing) {
      console.log(
        `Category seed: '${seed.slug}' already exists, skipping.`,
      );
      result.push({ id: existing.id, slug: existing.slug });
      continue;
    }

    const created = await prisma.category.create({
      data: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        isActive: true,
      },
    });
    console.log(`Category seed: created '${created.slug}' (id=${created.id}).`);
    result.push({ id: created.id, slug: created.slug });
  }

  return result;
}

async function seedProductWithVariantAndInventory(
  categoryId: string,
  productSeed: ProductSeed,
): Promise<void> {
  const existingProduct = await prisma.product.findUnique({
    where: { slug: productSeed.slug },
  });

  let productId: string;
  let productCreated = false;

  if (existingProduct) {
    console.log(
      `Product seed: '${productSeed.slug}' already exists, skipping product creation.`,
    );
    productId = existingProduct.id;
  } else {
    const created = await prisma.product.create({
      data: {
        categoryId,
        name: productSeed.name,
        slug: productSeed.slug,
        description: productSeed.name,
        isActive: true,
      },
    });
    console.log(
      `Product seed: created '${created.slug}' (id=${created.id}).`,
    );
    productId = created.id;
    productCreated = true;
  }

  const existingVariant = await prisma.productVariant.findUnique({
    where: { sku: productSeed.sku },
  });

  let variantId: string;

  if (existingVariant) {
    console.log(
      `Variant seed: sku '${productSeed.sku}' already exists, skipping variant creation.`,
    );
    variantId = existingVariant.id;
  } else {
    const created = await prisma.productVariant.create({
      data: {
        productId,
        sku: productSeed.sku,
        variantName: productSeed.variantName,
        unit: productSeed.unit,
        weight: new Prisma.Decimal(productSeed.weight),
        price: new Prisma.Decimal(productSeed.price),
        mrp: new Prisma.Decimal(productSeed.mrp),
        isDefault: true,
        isActive: true,
      },
    });
    console.log(
      `Variant seed: created sku '${created.sku}' (id=${created.id}).`,
    );
    variantId = created.id;
  }

  const existingInventory = await prisma.inventory.findUnique({
    where: { variantId },
  });

  if (existingInventory) {
    console.log(
      `Inventory seed: inventory for variant '${productSeed.sku}' already exists, skipping.`,
    );
    return;
  }

  await prisma.inventory.create({
    data: {
      variantId,
      availableStock: 100,
      reservedStock: 0,
      lowStockThreshold: 10,
      isInStock: true,
    },
  });
  console.log(
    `Inventory seed: created for variant '${productSeed.sku}' (availableStock=100).`,
  );

  // Suppress unused warning while keeping explicit creation flag for future hooks
  void productCreated;
}

async function seedProductsForCategory(category: {
  id: string;
  slug: string;
}): Promise<void> {
  const products = PRODUCT_SEEDS_BY_CATEGORY[category.slug] ?? [];
  for (const productSeed of products) {
    await seedProductWithVariantAndInventory(category.id, productSeed);
  }
}

async function main(): Promise<void> {
  console.log('--- Prisma seed started ---');

  await seedSuperAdmin();
  await seedDemoCustomer();
  const categories = await seedCategories();

  for (const category of categories) {
    await seedProductsForCategory(category);
  }

  console.log('--- Prisma seed finished ---');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
