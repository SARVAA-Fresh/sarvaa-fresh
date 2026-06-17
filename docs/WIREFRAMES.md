# SARVAA Fresh

# UI/UX Wireframe Documentation (WIREFRAMES.md)

**Version:** 1.0  
**Prepared By:** Senior Product Designer

## Design Philosophy

**Simple • Fast • Mobile First • Trust Building**

### Target Users

- Small Town Customers
- Families
- Working Professionals
- Store Administrators

### Primary Device

Mobile First

### Secondary Device

Desktop

---

# Global Design System

## Header

### Customer

- Logo
- Search Bar
- Cart Icon
- Profile Icon
- Location Selector *(Future)*

### Admin

- Logo
- Dashboard Menu
- Notification Icon
- Profile Menu

---

## Footer

- Customer Support
- About Us
- Terms & Conditions
- Privacy Policy
- Contact Information
- Social Media Links

---

## Navigation Pattern

### Mobile

#### Bottom Navigation

- Home
- Categories
- Cart
- Orders
- Profile

### Desktop

#### Top Navigation

- Home
- Products
- Orders
- Profile
- Cart

---

# 1. HOME PAGE

## Purpose

Landing page and primary entry point.

## Layout

```text
------------------------------------------------
HEADER
------------------------------------------------
LOGO
SEARCH BAR
CART ICON
------------------------------------------------
HERO BANNER
Fresh Fruits & Vegetables Delivered
Shop Now Button
------------------------------------------------
CATEGORIES
[Fruits]
[Vegetables]
------------------------------------------------
FEATURED PRODUCTS
Product Cards
------------------------------------------------
WHY CHOOSE US
Fresh
Affordable
Fast Delivery
------------------------------------------------
FOOTER
------------------------------------------------
```

## Components

### Header

- Logo
- Search
- Cart Icon

### Hero Section

- Promotional Banner
- CTA Button

### Categories Section

- Category Cards

### Product Grid

- Product Cards

## User Actions

- Search products
- Browse categories
- Open product page
- Add products to cart

## Mobile Design

- Single-column layout
- Scrollable cards
- Bottom navigation

## Desktop Design

- Hero banner full width
- 4-column product grid
- Top navigation bar

---

# 2. PRODUCT CATALOG PAGE

## Purpose

Browse products.

## Layout

```text
------------------------------------------------
HEADER
------------------------------------------------
SEARCH
FILTERS
------------------------------------------------
CATEGORY FILTER
PRICE FILTER
SORT
------------------------------------------------
PRODUCT GRID
------------------------------------------------
```

## Components

- Search Bar
- Category Filter
- Price Filter
- Sort Dropdown
- Product Cards

### Product Card

- Image
- Name
- Price
- Unit
- Add To Cart Button

## User Actions

- Search
- Filter
- Sort
- Add To Cart
- Open Product Details

## Mobile Design

- 2-column product grid
- Sticky search bar
- Bottom filters drawer

## Desktop Design

- Sidebar filters
- 4-column product grid

---

# 3. PRODUCT DETAIL PAGE

## Purpose

Product information.

## Layout

```text
------------------------------------------------
Product Image
Name
Price
Description
Quantity Selector
Add To Cart
Buy Now
------------------------------------------------
```

## Components

- Product Gallery
- Product Information
- Variant Selector
- Quantity Selector
- Add To Cart Button

## User Actions

- Change variant
- Change quantity
- Add to cart
- Buy now

## Mobile Design

- Vertical layout
- Large product image
- Sticky Add-to-Cart button

## Desktop Design

- Two-column layout
- Image left
- Details right

---

# 4. CART PAGE

## Purpose

Review selected items.

## Layout

```text
------------------------------------------------
Cart Items
------------------------------------------------
Item
Quantity
Price
Remove
------------------------------------------------
Subtotal
Delivery Fee
Total
------------------------------------------------
Checkout Button
------------------------------------------------
```

## Components

- Cart List
- Quantity Controls
- Price Summary
- Checkout Button

## User Actions

- Update quantity
- Remove item
- Continue shopping
- Checkout

## Mobile Design

- Stacked cart items
- Sticky checkout button

## Desktop Design

- Cart left
- Summary right

---

# 5. CHECKOUT PAGE

## Purpose

Place order.

## Layout

```text
------------------------------------------------
Address Section
------------------------------------------------
Delivery Date
------------------------------------------------
Payment Method

COD
UPI

------------------------------------------------
Order Summary
------------------------------------------------
Place Order Button
------------------------------------------------
```

## Components

- Address Selector
- Add Address Form
- Delivery Date Picker
- Payment Selection
- Order Summary

## User Actions

- Select address
- Choose payment
- Place order

## Mobile Design

- Step-by-step layout

## Desktop Design

- Split layout
- Form left
- Summary right

---

# 6. LOGIN PAGE

## Purpose

Customer login.

## Layout

```text
------------------------------------------------
LOGO
Mobile Number
Password
Login Button
Register Link
------------------------------------------------
```

## Components

- Mobile Field
- Password Field
- Login Button

## User Actions

- Login
- Go To Registration

## Mobile Design

- Centered card

## Desktop Design

- Centered authentication panel

---

# 7. REGISTRATION PAGE

## Purpose

Create account.

## Layout

```text
------------------------------------------------
Full Name
Mobile Number
Password
Confirm Password
Register Button
------------------------------------------------
```

## Components

- Name Input
- Mobile Input
- Password Input
- Confirm Password Input
- Register Button

## User Actions

- Register
- Login Redirect

---

# 8. CUSTOMER DASHBOARD

## Purpose

Customer account management.

## Layout

```text
------------------------------------------------
Profile Summary
------------------------------------------------
Orders
Addresses
Settings
------------------------------------------------
```

## Components

- Profile Card
- Order Summary
- Address Manager

## User Actions

- View orders
- Edit profile
- Manage addresses

## Mobile Design

- Tabbed layout

## Desktop Design

- Sidebar navigation

---

# 9. ORDER TRACKING PAGE

## Purpose

Track order progress.

## Layout

```text
------------------------------------------------
Order Number
------------------------------------------------
Timeline

Placed
Confirmed
Packed
Out For Delivery
Delivered

------------------------------------------------
```

## Components

- Order Summary
- Status Timeline
- Order Items

## User Actions

- Track order
- Contact support

## Mobile Design

- Vertical timeline

## Desktop Design

- Expanded timeline

---

# 10. ADMIN DASHBOARD

## Purpose

Business overview.

## Layout

```text
------------------------------------------------
Sidebar
------------------------------------------------
Orders Today
Revenue Today
Pending Orders
Low Stock
------------------------------------------------
Recent Orders
------------------------------------------------
```

## Components

- KPI Cards
- Revenue Widget
- Recent Orders Table

## User Actions

- Open orders
- Open inventory
- Open products

## Mobile Design

- Stacked KPI cards

## Desktop Design

- 4-card dashboard grid

---

# 11. PRODUCT MANAGEMENT PAGE

## Purpose

Manage products.

## Layout

```text
------------------------------------------------
Add Product Button
------------------------------------------------
Products Table
------------------------------------------------
```

## Components

- Search
- Filter
- Product Table
- Add Product Modal

### Product Table Columns

| Column |
|----------|
| Image |
| Name |
| Category |
| Price |
| Stock |
| Status |
| Actions |

## User Actions

- Add product
- Edit product
- Delete product

---

# 12. INVENTORY MANAGEMENT PAGE

## Purpose

Manage stock.

## Layout

```text
------------------------------------------------
Inventory Table
------------------------------------------------
Product
Variant
Available
Reserved
Low Stock
Actions
------------------------------------------------
```

## Components

- Inventory Table
- Stock Update Modal

## User Actions

- Increase stock
- Reduce stock
- View history

---

# 13. ORDER MANAGEMENT PAGE

## Purpose

Manage customer orders.

## Layout

```text
------------------------------------------------
Filters
------------------------------------------------
Orders Table
------------------------------------------------
```

## Components

- Search
- Filters
- Orders Table
- Status Update Modal

### Table Columns

| Column |
|----------|
| Order Number |
| Customer |
| Amount |
| Payment |
| Status |
| Date |
| Actions |

## User Actions

- View order
- Update status
- Cancel order

---

# Mobile-First Design Rules

1. All pages must work on **360px width**
2. Buttons minimum height: **44px**
3. Forms optimized for thumb usage
4. Bottom navigation always visible
5. Checkout process maximum **3 steps**

---

# UI Component Library

## Technology Stack

- ShadCN UI
- TailwindCSS
- Lucide Icons

## Core Components

- Button
- Card
- Input
- Modal
- Drawer
- Table
- Badge
- Alert
- Dropdown
- Tabs

---

# MVP Design Success Criteria

## Customer Goals

A customer should be able to:

1. Open website
2. Find products within 10 seconds
3. Add products to cart
4. Checkout in under 2 minutes
5. Track order status easily

## Admin Goals

An admin should be able to:

1. Add products
2. Update stock
3. Manage orders
4. Monitor daily business

without training or technical knowledge.

---

# Design Vision

The design should prioritize:

- Simplicity
- Trust
- Speed
- Usability

over visual complexity, ensuring smooth adoption by customers in small-town India.