# SARVAA Fresh

# Database Architecture Document (DATABASE.md)

**Version:** 1.0  
**Database:** PostgreSQL 16+  
**ORM:** Prisma ORM  
**ID Strategy:** UUID  
**Soft Delete Strategy:** Enabled

---

# 1. Database Design Principles

## Core Principles

### Category Agnostic

Products must support:

- Fruits
- Vegetables
- Dairy
- Grocery
- Household
- Future Categories

without code changes.

### Variant Based Inventory

Inventory belongs to product variants.

#### Example

**Tomato**

- 500g
- 1kg
- 2kg

Each variant has separate stock.

### Event-Based Order Tracking

Order history must be preserved.

```text
Placed
↓
Confirmed
↓
Packed
↓
Out For Delivery
↓
Delivered
```

### Auditability

Every table contains:

- created_at
- updated_at

Most business tables contain:

- deleted_at

for soft delete support.

---

# 2. Core Entity Relationship Overview

```text
users
│
├── addresses
├── orders
├── reviews (future)
└── loyalty_transactions (future)

categories
│
├── products
├── product_variants
├── inventory
└── order_items

orders
│
├── order_items
├── payments
└── order_status_history

admins
│
├── inventory_updates
└── order_updates
```

---

# 3. USERS

## Purpose

Customer Accounts

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| full_name | VARCHAR(150) |
| mobile | VARCHAR(15) UNIQUE |
| email | VARCHAR(255) NULL |
| password_hash | TEXT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |
| deleted_at | TIMESTAMP NULL |

## Indexes

- mobile UNIQUE
- email

## Relationship

```text
User
├── Addresses
├── Orders
└── Future Reviews
```

---

# 4. ADDRESSES

## Purpose

Multiple customer delivery addresses

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| user_id | UUID FK |
| label | VARCHAR(50) |
| full_address | TEXT |
| city | VARCHAR(100) |
| state | VARCHAR(100) |
| pincode | VARCHAR(10) |
| landmark | VARCHAR(255) |
| is_default | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## Foreign Keys

```text
user_id → users.id
```

---

# 5. CATEGORIES

## Purpose

Product Classification

### Examples

- Fruits
- Vegetables
- Dairy
- Grocery

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| name | VARCHAR(100) |
| slug | VARCHAR(120) UNIQUE |
| description | TEXT |
| image_url | TEXT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

# 6. PRODUCTS

## Purpose

Master Product Information

### Examples

- Tomato
- Milk
- Rice

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| category_id | UUID FK |
| name | VARCHAR(255) |
| slug | VARCHAR(255) UNIQUE |
| description | TEXT |
| image_url | TEXT |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |
| deleted_at | TIMESTAMP NULL |

## Foreign Keys

```text
category_id → categories.id
```

---

# 7. PRODUCT_VARIANTS

## Purpose

Size / Weight Variations

### Example

**Tomato**

- 500g
- 1kg
- 2kg

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| product_id | UUID FK |
| sku | VARCHAR(100) UNIQUE |
| variant_name | VARCHAR(100) |
| unit | VARCHAR(50) |
| price | NUMERIC(10,2) |
| mrp | NUMERIC(10,2) |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## Foreign Keys

```text
product_id → products.id
```

---

# 8. INVENTORY

## Purpose

Stock Management

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| variant_id | UUID FK |
| available_stock | INTEGER |
| reserved_stock | INTEGER |
| low_stock_threshold | INTEGER |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## Foreign Keys

```text
variant_id → product_variants.id
```

## Formula

### Sellable Stock

```text
available_stock - reserved_stock
```

---

# 9. ORDERS

## Purpose

Customer Orders

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| user_id | UUID FK |
| address_id | UUID FK |
| order_number | VARCHAR(50) UNIQUE |
| subtotal | NUMERIC(10,2) |
| delivery_fee | NUMERIC(10,2) |
| total_amount | NUMERIC(10,2) |
| current_status | VARCHAR(50) |
| payment_status | VARCHAR(50) |
| notes | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## Foreign Keys

```text
user_id → users.id
address_id → addresses.id
```

---

# 10. ORDER_ITEMS

## Purpose

Products inside orders

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| order_id | UUID FK |
| variant_id | UUID FK |
| product_name_snapshot | VARCHAR(255) |
| unit_price | NUMERIC(10,2) |
| quantity | INTEGER |
| total_price | NUMERIC(10,2) |

## Foreign Keys

```text
order_id → orders.id
variant_id → product_variants.id
```

### Notes

Snapshot fields prevent history loss.

---

# 11. PAYMENTS

## Purpose

Payment Records

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| order_id | UUID FK |
| payment_method | VARCHAR(50) |
| transaction_reference | VARCHAR(255) |
| payment_proof_url | TEXT |
| amount | NUMERIC(10,2) |
| payment_status | VARCHAR(50) |
| verified_by | UUID NULL |
| verified_at | TIMESTAMP NULL |
| created_at | TIMESTAMP |

## Foreign Keys

```text
order_id → orders.id
verified_by → admins.id
```

---

# 12. ADMINS

## Purpose

Back Office Users

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| full_name | VARCHAR(150) |
| email | VARCHAR(255) UNIQUE |
| password_hash | TEXT |
| role | VARCHAR(50) |
| is_active | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

## Roles

- SUPER_ADMIN
- MANAGER
- STAFF

---

# 13. ORDER_STATUS_HISTORY

## Purpose

Complete Order Timeline

## Fields

| Field | Type |
|---------|---------|
| id | UUID PK |
| order_id | UUID FK |
| status | VARCHAR(50) |
| remarks | TEXT |
| updated_by_admin | UUID NULL |
| created_at | TIMESTAMP |

## Foreign Keys

```text
order_id → orders.id
updated_by_admin → admins.id
```

## Statuses

- PLACED
- CONFIRMED
- PACKED
- OUT_FOR_DELIVERY
- DELIVERED
- CANCELLED

---

# 14. FUTURE TABLES

## Vendors

```text
vendors
vendor_products
```

Supports marketplace model.

---

## Notifications

```text
notifications
notification_logs
```

Channels:

- WhatsApp
- SMS
- Email
- Push

---

## Coupons

```text
coupons
coupon_usages
```

---

## Reviews

```text
reviews
```

Product reviews and ratings.

---

## Loyalty Program

```text
loyalty_accounts
loyalty_transactions
```

Reward points system.

---

# 15. Recommended Indexes

## Single Column Indexes

```text
users.mobile
products.slug
categories.slug
orders.order_number
orders.user_id
orders.current_status
order_items.order_id
inventory.variant_id
payments.order_id
```

## Composite Indexes

```text
(product_id, is_active)
(user_id, created_at)
(order_id, status)
```

---

# 16. SQL CREATE TABLE (Core Schema)

## Enable UUID

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## USERS

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

---

## CATEGORIES

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## PRODUCTS

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

---

## PRODUCT_VARIANTS

```sql
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    variant_name VARCHAR(100),
    unit VARCHAR(50),
    price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## INVENTORY

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID UNIQUE NOT NULL REFERENCES product_variants(id),
    available_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Note

The remaining tables (`addresses`, `orders`, `order_items`, `payments`, `admins`, and `order_status_history`) should be implemented following the same conventions during the development phase.

This database architecture serves as the source of truth for:

- PostgreSQL Schema Design
- Prisma ORM Models
- NestJS Backend Development
- Inventory Management
- Order Management
- Future Marketplace Expansion
- Reporting & Analytics