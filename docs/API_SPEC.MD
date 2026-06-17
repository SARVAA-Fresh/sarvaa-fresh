# SARVAA Fresh

# API Specification Document (API_SPEC.md)

**Version:** 1.0  
**Style:** REST API  
**Format:** OpenAPI / Swagger Inspired

## Base URL

```http
/api/v1
```

## Authentication

```text
JWT Bearer Token
```

## Content Type

```http
application/json
```

---

# API RESPONSE STANDARD

## Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

## Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

# AUTHENTICATION MODULE

## Register User

### Endpoint

```http
POST /auth/register
```

### Authentication

Public

### Request Body

```json
{
  "fullName": "Piyush Sharma",
  "mobile": "9876543210",
  "password": "Password@123"
}
```

### Validation

- fullName required
- mobile unique
- mobile 10 digits
- password minimum 8 characters

### Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid"
  }
}
```

### Errors

- 400 Validation Error
- 409 Mobile Already Exists

---

## Login User

### Endpoint

```http
POST /auth/login
```

### Authentication

Public

### Request

```json
{
  "mobile": "9876543210",
  "password": "Password@123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "user": {}
  }
}
```

### Errors

- 401 Invalid Credentials

---

## Get Profile

### Endpoint

```http
GET /auth/profile
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Piyush Sharma",
    "mobile": "9876543210"
  }
}
```

---

# CATEGORY MODULE

## Get Categories

### Endpoint

```http
GET /categories
```

### Authentication

Public

### Query Parameters

- page
- limit
- search

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Fruits",
      "slug": "fruits"
    }
  ]
}
```

---

## Get Category By Slug

### Endpoint

```http
GET /categories/{slug}
```

### Authentication

Public

### Response

```json
{
  "success": true,
  "data": {}
}
```

---

# PRODUCT MODULE

## Get Products

### Endpoint

```http
GET /products
```

### Authentication

Public

### Query Parameters

- page
- limit
- search
- category
- sort
- minPrice
- maxPrice

### Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {}
  }
}
```

---

## Get Product Details

### Endpoint

```http
GET /products/{slug}
```

### Authentication

Public

### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Tomato",
    "description": "Fresh Tomato",
    "variants": []
  }
}
```

---

## Search Products

### Endpoint

```http
GET /products/search
```

### Authentication

Public

### Query

```text
q
```

### Example

```http
GET /products/search?q=tomato
```

---

# CART MODULE

## Get Cart

### Endpoint

```http
GET /cart
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "subtotal": 250
  }
}
```

---

## Add Item To Cart

### Endpoint

```http
POST /cart/items
```

### Authentication

Customer JWT

### Request

```json
{
  "variantId": "uuid",
  "quantity": 2
}
```

### Validation

- quantity > 0
- variant exists
- stock available

### Response

```json
{
  "success": true,
  "message": "Item added to cart"
}
```

### Errors

- 404 Product Not Found
- 409 Insufficient Stock

---

## Update Cart Item

### Endpoint

```http
PATCH /cart/items/{itemId}
```

### Authentication

Customer JWT

### Request

```json
{
  "quantity": 5
}
```

---

## Remove Cart Item

### Endpoint

```http
DELETE /cart/items/{itemId}
```

### Authentication

Customer JWT

---

# ORDER MODULE

## Create Order

### Endpoint

```http
POST /orders
```

### Authentication

Customer JWT

### Request

```json
{
  "addressId": "uuid",
  "paymentMethod": "COD",
  "notes": "Deliver after 5 PM"
}
```

### Validation

- cart not empty
- address exists
- payment method valid

### Response

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD10001"
  }
}
```

---

## Get My Orders

### Endpoint

```http
GET /orders
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": []
}
```

---

## Get Order Details

### Endpoint

```http
GET /orders/{orderId}
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD10001",
    "status": "CONFIRMED",
    "items": []
  }
}
```

---

## Track Order

### Endpoint

```http
GET /orders/{orderId}/tracking
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": {
    "currentStatus": "OUT_FOR_DELIVERY",
    "history": []
  }
}
```

---

# PAYMENT MODULE

## Upload UPI Payment Proof

### Endpoint

```http
POST /payments/upload-proof
```

### Authentication

Customer JWT

### Content Type

```http
multipart/form-data
```

### Fields

- orderId
- paymentProofFile
- transactionReference

### Response

```json
{
  "success": true,
  "message": "Payment proof uploaded"
}
```

---

## Get Payment Status

### Endpoint

```http
GET /payments/{orderId}
```

### Authentication

Customer JWT

### Response

```json
{
  "success": true,
  "data": {
    "status": "PENDING"
  }
}
```

---

# INVENTORY MODULE (Admin Only)

## Get Inventory

### Endpoint

```http
GET /inventory
```

### Authentication

Admin JWT

### Response

```json
{
  "success": true,
  "data": []
}
```

---

## Update Stock

### Endpoint

```http
PATCH /inventory/{variantId}
```

### Authentication

Admin JWT

### Request

```json
{
  "availableStock": 100
}
```

### Validation

- stock >= 0

---

# ADMIN AUTH MODULE

## Admin Login

### Endpoint

```http
POST /admin/auth/login
```

### Authentication

Public

### Request

```json
{
  "email": "admin@sarvaafresh.com",
  "password": "Password@123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token"
  }
}
```

---

# ADMIN DASHBOARD

## Dashboard Metrics

### Endpoint

```http
GET /admin/dashboard
```

### Authentication

Admin JWT

### Response

```json
{
  "success": true,
  "data": {
    "ordersToday": 20,
    "revenueToday": 3500,
    "pendingOrders": 5,
    "lowStockItems": 3
  }
}
```

---

# ADMIN PRODUCT MANAGEMENT

## Create Product

### Endpoint

```http
POST /admin/products
```

### Authentication

Admin JWT

### Request

```json
{
  "categoryId": "uuid",
  "name": "Tomato",
  "description": "Fresh Tomato"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "productId": "uuid"
  }
}
```

---

## Update Product

### Endpoint

```http
PATCH /admin/products/{productId}
```

### Authentication

Admin JWT

---

## Delete Product

### Endpoint

```http
DELETE /admin/products/{productId}
```

### Authentication

Admin JWT

---

# ADMIN CATEGORY MANAGEMENT

## Create Category

### Endpoint

```http
POST /admin/categories
```

### Authentication

Admin JWT

---

## Update Category

### Endpoint

```http
PATCH /admin/categories/{categoryId}
```

### Authentication

Admin JWT

---

## Delete Category

### Endpoint

```http
DELETE /admin/categories/{categoryId}
```

### Authentication

Admin JWT

---

# ADMIN ORDER MANAGEMENT

## Get All Orders

### Endpoint

```http
GET /admin/orders
```

### Authentication

Admin JWT

### Query Parameters

- page
- limit
- status
- paymentStatus

---

## Update Order Status

### Endpoint

```http
PATCH /admin/orders/{orderId}/status
```

### Authentication

Admin JWT

### Request

```json
{
  "status": "PACKED"
}
```

### Allowed Statuses

- PLACED
- CONFIRMED
- PACKED
- OUT_FOR_DELIVERY
- DELIVERED
- CANCELLED

### Response

```json
{
  "success": true,
  "message": "Order status updated"
}
```

---

# COMMON HTTP STATUS CODES

| Code | Meaning |
|--------|----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

# MVP API COUNT

| Module | APIs |
|----------|------|
| Authentication | 3 |
| Categories | 2 |
| Products | 3 |
| Cart | 4 |
| Orders | 4 |
| Payments | 2 |
| Inventory | 2 |
| Admin Dashboard | 1 |
| Admin Products | 3 |
| Admin Categories | 3 |
| Admin Orders | 2 |

## Total MVP APIs

**29 APIs**

---

# Source Of Truth

This API contract becomes the single source of truth for:

- Cursor
- Codex
- NestJS Backend Development
- Prisma Integration
- Frontend Integration
- Testing