# Organization Management System

This comprehensive organization management system provides administrators with complete control over all platform organizations, their subscriptions, trials, users, and settings.

## Features

### 1. Organization Overview Dashboard

- **Statistics Cards**: Total organizations, active organizations, trial organizations, suspended organizations
- **Real-time Metrics**: Organizations created this month, total users across all organizations, trials expiring soon
- **Visual Indicators**: Color-coded status badges, subscription tier indicators, and trial status displays

### 2. Advanced Organization Search & Filtering

- **Text Search**: Search by organization name or domain
- **Status Filters**: Quick filter by active, suspended, or pending organizations
- **Advanced Filters**:
  - Filter by subscription tier (basic, professional, enterprise)
  - Filter by trial status (trial, subscribed, expired)
  - Date range filtering for creation dates
  - Sorting options (name, created date, user count, trial end date)
  - Customizable results per page

### 3. Organization List Management

- **Bulk Selection**: Select individual organizations or all organizations at once
- **Bulk Actions**:
  - Bulk activate/suspend organizations
  - Export selected organizations to CSV
  - Mass operations with confirmation dialogs
- **Individual Organization Cards**: Display comprehensive organization information including:
  - Organization name, domain, and branding
  - Status and subscription tier badges
  - User count and limits
  - Trial status and expiration dates
  - Creation date and activity metrics

### 4. Organization Details Dialog

- **Comprehensive Organization View**: Tabbed interface with multiple sections:
  - **Overview**: Basic info, status, settings, contact information
  - **Users**: All organization members with roles and activity
  - **Subscription**: Billing details, plan information, payment status
  - **Activity**: Recent organization activity logs with timestamps
- **Settings Management**: View and manage organization features and limits
- **Contact Information**: Admin details and organization contact info
- **Real-time Data**: Live updates of organization metrics and user activity

### 5. Organization Creation

- **New Organization Form**: Comprehensive form with validation
- **Admin User Setup**: Create organization admin during setup
- **Subscription Configuration**: Select tier and trial duration
- **Settings Configuration**: Set user limits and enabled features
- **Contact Information**: Organization and admin contact details
- **Form Validation**: Real-time validation with error messages

### 6. Organization Editing

- **Comprehensive Editing**: Edit all organization information and settings
- **Subscription Management**: Change subscription tiers and limits
- **Feature Management**: Enable/disable organization features
- **Settings Updates**: Modify user limits, branding, and API access
- **Contact Updates**: Update admin and organization contact information

### 7. Organization Actions

- **Status Management**:
  - Activate suspended or pending organizations
  - Suspend active organizations with reason tracking
  - Bulk status changes with confirmation
- **Trial Management**:
  - Reset trial periods with custom durations
  - Extend trials for specific organizations
  - Convert trials to paid subscriptions
- **Subscription Actions**:
  - Manage subscription tiers and billing
  - Update payment information
  - Handle subscription renewals
- **Account Management**:
  - Edit organization profiles and settings
  - Manage user limits and permissions
  - Export organization data

### 8. Security & Compliance Features

- **Audit Trail**: Complete activity logging for all organization actions
- **User Tracking**: Monitor organization user activity and sessions
- **Permission Controls**: Feature-based access control with granular settings
- **Secure Actions**: Confirmation dialogs for destructive operations
- **Data Export**: Secure export of organization data for compliance

## Components Structure

```
admin-console/src/app/admin/organizations/
├── page.tsx                                    # Main organizations management page
├── components/
│   ├── organization-details-dialog.tsx        # Comprehensive organization details view
│   ├── organization-actions-dropdown.tsx      # Individual organization action menu
│   ├── organization-bulk-actions.tsx          # Bulk operations interface
│   ├── organization-advanced-filters.tsx      # Advanced search and filtering
│   ├── organization-create-dialog.tsx         # New organization creation form
│   └── organization-edit-dialog.tsx           # Organization editing interface
└── README.md                                  # This documentation
```

## API Integration

The system integrates with the following API endpoints:

- `GET /api/v1/admin/organizations` - List organizations with filtering and pagination
- `GET /api/v1/admin/organizations/:id` - Get detailed organization information
- `POST /api/v1/admin/organizations` - Create new organization
- `PUT /api/v1/admin/organizations/:id` - Update organization information
- `PUT /api/v1/admin/organizations/:id/status` - Update organization status
- `GET /api/v1/admin/organizations/:id/users` - Get organization users
- `GET /api/v1/admin/organizations/:id/activity` - Get organization activity logs
- `GET /api/v1/admin/organizations/:id/subscription` - Get subscription details
- `POST /api/v1/admin/organizations/:id/trial/reset` - Reset trial period
- `DELETE /api/v1/admin/organizations/:id` - Delete organization
- `GET /api/v1/admin/organizations/statistics` - Get organization statistics

## Usage

### Accessing Organization Management

Navigate to `/admin/organizations` in the admin console to access the organization management interface.

### Managing Organizations

1. **View Organizations**: Browse the paginated organization list with real-time statistics
2. **Search & Filter**: Use the advanced filtering system to find specific organizations
3. **Bulk Operations**: Select multiple organizations for bulk actions
4. **Individual Actions**: Use the action dropdown for individual organization management
5. **Create Organizations**: Click "Create Organization" to add new platform organizations
6. **View Details**: Click "View Details" to see comprehensive organization information

### Trial Management

- **Reset Trials**: Extend or reset trial periods for organizations
- **Monitor Expiration**: Track trials expiring soon with automated alerts
- **Convert Trials**: Assist organizations in converting to paid subscriptions

### Subscription Management

- **Tier Management**: Upgrade or downgrade subscription tiers
- **Feature Control**: Enable/disable features based on subscription level
- **Billing Oversight**: Monitor payment status and billing cycles

## Key Features by Subscription Tier

### Basic Tier

- Essential features for small teams
- Limited user count (typically 10-50 users)
- Basic reporting and analytics
- Standard support

### Professional Tier

- Advanced features for growing businesses
- Increased user limits (typically 50-200 users)
- Advanced analytics and reporting
- Priority support
- Custom branding options

### Enterprise Tier

- Full feature set for large organizations
- Unlimited or high user limits (200+ users)
- Advanced integrations and API access
- Dedicated support
- Custom features and configurations

## Security Considerations

- All organization actions are logged for audit purposes
- Sensitive operations require confirmation dialogs
- User activity monitoring provides security oversight
- Feature-based permissions control access levels
- Data export capabilities support compliance requirements

## Future Enhancements

- **Advanced Analytics**: Organization behavior analytics and insights
- **Automated Billing**: Automated subscription management and billing
- **Integration APIs**: Third-party service integrations
- **Custom Workflows**: Organization-specific workflow configurations
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Reporting**: Custom reports and data visualization
- **Multi-region Support**: Geographic organization management
- **Compliance Tools**: Enhanced audit and compliance features
