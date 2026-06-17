# SARVAA Fresh

## Product Requirements Document (PRD)

**Version:** 1.0  
**Document Owner:** Founder Team  
**Prepared By:** Product Management & CTO Office  
**Date:** June 2026

---

# 1. Executive Summary

SARVAA Fresh is a hyperlocal commerce platform designed to bring modern online ordering and delivery convenience to small-town India.

The company begins with fresh fruits and vegetables through the existing offline business, SR Fruits & Vegetables, and gradually expands into groceries, dairy products, household essentials, and other local commerce services.

The MVP focuses on solving a simple problem:

> "Allow customers to order fresh fruits and vegetables online and receive them at their doorstep."

---

# 2. Product Vision

## Vision Statement

**Convenience Should Not Depend On Location.**

## Long-Term Vision

Build the most trusted hyperlocal commerce platform for Tier-2, Tier-3, and small-town India.

## Mission

Digitize local commerce by connecting customers with nearby stores and providing reliable ordering, inventory management, and doorstep delivery.

## Strategic Goals

### Short-Term (0–6 Months)

- Launch MVP
- Validate customer demand
- Establish operational workflow
- Achieve repeat orders

### Mid-Term (6–18 Months)

- Expand categories
- Build customer retention features
- Improve delivery operations

### Long-Term (18+ Months)

- Multi-vendor marketplace
- Hyperlocal service ecosystem
- AI-powered commerce platform

---

# 3. Problem Statement

Customers in small towns face several challenges:

- Limited online ordering options
- No reliable doorstep delivery
- Lack of inventory visibility
- Time wasted visiting multiple stores
- Difficulty ordering during busy schedules

Local businesses face:

- Manual order management
- No digital presence
- Inventory tracking issues
- Limited customer reach

SARVAA Fresh addresses these problems through a simple digital ordering platform.

---

# 4. User Personas

## Persona 1: Household Customer

**Name:** Sunita  
**Age:** 34  
**Occupation:** Homemaker

### Goals

- Order vegetables quickly
- Save travel time
- Receive fresh products

### Pain Points

- Busy schedule
- No local delivery options
- Limited transportation

---

## Persona 2: Working Professional

**Name:** Ravi  
**Age:** 28  
**Occupation:** Private Employee

### Goals

- Order after work
- Schedule deliveries
- Use digital payments

### Pain Points

- Lack of time
- Store closing hours

---

## Persona 3: Business Administrator

**Name:** Store Manager

### Responsibilities

- Manage inventory
- Process orders
- Update stock
- Track revenue

### Pain Points

- Manual bookkeeping
- Inventory inaccuracies
- Order tracking issues

---

# 5. User Journeys

## Customer Journey

### Registration

```text
Customer visits website
↓
Creates account
↓
Logs in
↓
Views catalog
```

### Product Discovery

```text
Browse categories
OR
Search products
↓
View product details
↓
Add items to cart
```

### Checkout

```text
Review cart
↓
Enter address
↓
Select delivery date
↓
Choose payment method
↓
Place order
```

### Order Tracking

```text
Order placed
↓
Confirmed
↓
Packed
↓
Out For Delivery
↓
Delivered
```

## Admin Journey

```text
Admin Login
↓
Dashboard
↓
View orders
↓
Confirm order
↓
Update stock
↓
Update delivery status
↓
Mark delivered
```

---

# 6. Functional Requirements

## Authentication Module

### Customer Features

- Registration
- Login
- Logout
- Password reset

### Fields

- Name
- Mobile Number
- Password

### Future

- OTP Login
- Social Login

---

## Product Catalog Module

### Features

- Category listing
- Product listing
- Search products
- Product detail page

### Product Information

- Name
- Category
- Images
- Price
- Unit
- Description
- Stock Availability

---

## Cart Module

### Features

- Add item
- Remove item
- Update quantity
- View total price

---

## Checkout Module

### Features

- Address selection
- Contact information
- Delivery date
- Payment method selection

---

## Payment Module

### MVP

#### Cash On Delivery

Order created immediately.

#### UPI Payment

Customer uploads payment screenshot.

Admin verifies payment manually.

### Future

- Automated payment gateway

---

## Order Management Module

### Customer

- View orders
- View order status

### Admin

- View all orders
- Update status
- Cancel orders

### Order States

- Placed
- Confirmed
- Packed
- Out For Delivery
- Delivered
- Cancelled

---

## Inventory Module

### Admin Features

- Add stock
- Update stock
- View stock levels
- Low stock warnings

---

## Dashboard Module

### Admin Dashboard Metrics

- Orders Today
- Revenue Today
- Pending Orders
- Delivered Orders
- Inventory Alerts

---

# 7. Non-Functional Requirements

## Performance

- Page load under 3 seconds
- API response under 500ms
- Support 100+ concurrent users

## Scalability

Architecture must support:

- Additional categories
- Additional locations
- Additional stores
- Future microservices

## Security

- Password hashing
- Secure authentication
- HTTPS
- Input validation
- Role-based access control

## Availability

Target:

- 99% uptime during MVP

## Maintainability

Requirements:

- Modular architecture
- API-first design
- Clean documentation
- AI-friendly codebase

## Mobile Responsiveness

Website must work on:

- Android phones
- iPhones
- Tablets
- Desktop browsers

---

# 8. MVP Scope

## Included

### Customer

- Registration
- Login
- Product Catalog
- Search
- Product Details
- Cart
- Checkout
- COD
- UPI Screenshot Upload
- Order Tracking

### Admin

- Dashboard
- Product Management
- Inventory Management
- Order Management

### System

- Product Categories
- Order Status Tracking
- Basic Reporting

---

# 9. Out Of Scope (MVP)

The following will **NOT** be built in the first release:

- Mobile Apps
- Multi-Vendor Marketplace
- Loyalty Program
- Referral Program
- Reviews
- Ratings
- Coupons
- Push Notifications
- GPS Tracking
- AI Recommendations
- Subscription Orders
- Advanced Analytics
- Automated Delivery Routing

---

# 10. Future Roadmap

## Phase 2

- Grocery Category
- Dairy Category
- Household Products
- WhatsApp Notifications
- OTP Login

## Phase 3

- Customer Reviews
- Coupons
- Loyalty Points
- Referral Program

## Phase 4

- Mobile Applications
- Vendor Management
- Multi-Store Operations

## Phase 5

- Marketplace Model
- AI Recommendations
- Demand Forecasting
- Route Optimization

---

# 11. Success Metrics

## Business Metrics

### First 30 Days

- 100 Registered Users
- 50 Orders
- 20 Repeat Customers

### First 90 Days

- 500 Registered Users
- 300 Orders
- 30% Repeat Purchase Rate

## Product Metrics

- Cart Conversion Rate
- Average Order Value
- Daily Active Users
- Order Completion Rate

## Operational Metrics

- Order Fulfillment Time
- Delivery Success Rate
- Inventory Accuracy

---

# 12. Risks And Assumptions

## Risks

### Operational Risk

Delivery delays may impact customer trust.

**Mitigation:**

- Limit service area initially
- Manual monitoring

### Inventory Risk

Stock mismatches may create customer dissatisfaction.

**Mitigation:**

- Daily inventory updates
- Low-stock alerts

### Adoption Risk

Customers may hesitate to order online.

**Mitigation:**

- COD support
- Local marketing
- Family and community referrals

### Technical Risk

Rapid MVP development may introduce bugs.

**Mitigation:**

- Controlled launch
- Manual testing
- Incremental releases

---

# 13. Launch Definition

The MVP will be considered successful when:

### A customer can:

1. Register
2. Browse products
3. Add items to cart
4. Checkout
5. Pay using COD or UPI
6. Track order status
7. Receive delivery

### And the admin can:

1. Add products
2. Update inventory
3. Manage orders
4. Update order statuses

without manual database intervention.

---

# Product Vision Summary

**SARVAA Fresh is not a fruits and vegetables website.**

It is the first step toward building a hyperlocal commerce ecosystem for small-town India where convenience, reliability, and digital access are available to every customer regardless of location.