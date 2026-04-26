# Tether-ERP | Procurement Module

Enterprise Resource Planning system focused on procurement management. Built with Next.js 15, React 19, and NextUI (HeroUI) components.

## Features

- **Dashboard Overview**: System health, metrics, and recent activity
- **Purchase Order Management**: Create, track, and manage purchase orders
- **Vendor Management**: Comprehensive vendor database and performance tracking
- **Inventory Control**: Real-time inventory tracking and stock management
- **Requisition System**: Multi-level approval workflows for purchase requisitions
- **Analytics & Reporting**: Spend analysis, vendor performance, and cost savings reports
- **User Management**: Admin users, roles, and permissions
- **System Monitoring**: Analytics, audit logs, API monitoring
- **Configuration**: System settings, feature flags, notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update the API URL in `.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The procurement portal will be available at [http://localhost:3001](http://localhost:3001).

### Build

Build for production:

```bash
npm run build
npm start
```

## Project Structure

```
admin-console/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── admin/             # Admin routes
│   │   │   ├── dashboard/     # Dashboard page
│   │   │   ├── purchase-orders/ # Purchase order management
│   │   │   ├── vendors/       # Vendor management
│   │   │   ├── inventory/     # Inventory control
│   │   │   └── layout.tsx     # Admin layout
│   │   ├── components/        # Landing page components
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable components
│   │   ├── ui/               # NextUI components
│   │   └── layout/           # Layout components
│   └── lib/                  # Utilities and configuration
│       ├── utils.ts          # Utility functions
│       └── routes-config.tsx # Navigation configuration
├── package.json
└── next.config.ts
```

## Key Features

### Purchase Order Management

The purchase order management page (`/admin/purchase-orders`) provides:

- Create and edit purchase orders
- Track order status and delivery
- Automated approval workflows
- Integration with vendor and inventory systems
- PDF generation for purchase orders

### Vendor Management

The vendor management page (`/admin/vendors`) includes:

- Comprehensive vendor database
- Performance tracking and ratings
- Contract management
- Payment terms and conditions
- Vendor communication history

### Inventory Control

The inventory page (`/admin/inventory`) offers:

- Real-time stock levels
- Automated reorder points
- Stock movement tracking
- Multi-location inventory
- Integration with purchase orders

### Requisition System

The requisition system (`/admin/requisitions`) features:

- Multi-level approval workflows
- Budget controls and validation
- Requisition to PO conversion
- Department-wise requisitions
- Approval history and audit trail

### Analytics & Reporting

The analytics page (`/admin/analytics`) provides:

- Spend analysis by category, vendor, department
- Vendor performance metrics
- Cost savings tracking
- Budget vs. actual comparisons
- Custom report generation

## API Integration

The procurement module communicates with the Tether-ERP backend API:

- Base URL: Configured via `NEXT_PUBLIC_API_URL`
- Authentication: JWT token system with role-based access
- **Purchase Order APIs:**
  - `GET /api/v1/purchase-orders` - Get all purchase orders
  - `POST /api/v1/purchase-orders` - Create new purchase order
  - `PUT /api/v1/purchase-orders/{id}` - Update purchase order
  - `DELETE /api/v1/purchase-orders/{id}` - Delete purchase order
- **Vendor APIs:**
  - `GET /api/v1/vendors` - Get all vendors
  - `POST /api/v1/vendors` - Create new vendor
  - `PUT /api/v1/vendors/{id}` - Update vendor
- **Inventory APIs:**
  - `GET /api/v1/inventory` - Get inventory items
  - `POST /api/v1/inventory` - Add inventory item
  - `PUT /api/v1/inventory/{id}` - Update inventory
- **Requisition APIs:**
  - `GET /api/v1/requisitions` - Get requisitions
  - `POST /api/v1/requisitions` - Create requisition
  - `PUT /api/v1/requisitions/{id}/approve` - Approve requisition

## Deployment

The procurement module can be deployed alongside the main application or as a separate service:

1. Build the application: `npm run build`
2. Deploy to your hosting platform
3. Ensure the API URL environment variable points to your backend
4. Configure authentication and authorization

## Development Notes

- Built with NextUI (HeroUI) component library for modern UI
- Responsive design works on desktop and mobile
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations

## Technology Stack

- **Framework**: Next.js 16.1.6
- **UI Library**: NextUI (HeroUI) 2.6.10
- **State Management**: Zustand, TanStack Query
- **Styling**: Tailwind CSS 4.1.10
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
