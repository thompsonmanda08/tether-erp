# User Management System

This comprehensive user management system provides administrators with full control over platform users, their roles, permissions, and activities.

## Features

### 1. User Overview Dashboard

- **Statistics Cards**: Total users, active users, suspended users, pending users
- **Real-time Metrics**: Users created this month, users logged in today
- **Visual Indicators**: Color-coded status badges and role indicators

### 2. Advanced User Search & Filtering

- **Text Search**: Search by name, email, or organization
- **Status Filters**: Quick filter by active, suspended, pending, or inactive users
- **Advanced Filters**:
  - Filter by role (admin, manager, user, viewer)
  - Filter by email verification status
  - Date range filtering for registration dates
  - Sorting options (name, email, created date, last login)
  - Customizable results per page

### 3. User List Management

- **Bulk Selection**: Select individual users or all users at once
- **Bulk Actions**:
  - Bulk activate/suspend users
  - Export selected users to CSV
  - Mass operations with confirmation dialogs
- **Individual User Cards**: Display comprehensive user information including:
  - Profile information and avatar
  - Status and role badges
  - Organization memberships
  - Last login and activity metrics
  - Contact information

### 4. User Details Dialog

- **Comprehensive User View**: Tabbed interface with multiple sections:
  - **Overview**: Basic info, status, activity summary
  - **Organizations**: All organization memberships with roles and permissions
  - **Activity**: Recent user activity logs with timestamps and IP addresses
  - **Sessions**: Active and expired sessions with device information
- **Session Management**: Terminate individual sessions or all sessions
- **Real-time Data**: Live updates of user activity and session status

### 5. User Creation

- **New User Form**: Comprehensive form with validation
- **Role Assignment**: Select from predefined roles with descriptions
- **Profile Information**: Department, job title, and contact details
- **Invitation System**: Option to send email invitations automatically
- **Form Validation**: Real-time validation with error messages

### 6. User Editing

- **Inline Editing**: Edit user information directly from the management interface
- **Role Management**: Change user roles and permissions
- **Status Updates**: Activate, suspend, or deactivate users
- **Profile Updates**: Modify department, job title, and contact information
- **Organization Management**: View and manage organization memberships

### 7. User Actions

- **Status Management**:
  - Activate suspended or inactive users
  - Suspend active users with reason tracking
  - Bulk status changes with confirmation
- **Security Actions**:
  - Reset user passwords with email notifications
  - Terminate user sessions for security
  - Impersonate users for support purposes
- **Account Management**:
  - Edit user profiles and permissions
  - Manage organization memberships
  - Export user data

### 8. Security Features

- **Audit Trail**: Complete activity logging for all user actions
- **Session Tracking**: Monitor active sessions with device and location info
- **Permission Controls**: Role-based access control with granular permissions
- **Secure Actions**: Confirmation dialogs for destructive operations
- **Impersonation**: Secure user impersonation for support scenarios

## Components Structure

```
admin-console/src/app/admin/users/
├── page.tsx                           # Main users management page
├── components/
│   ├── user-details-dialog.tsx       # Comprehensive user details view
│   ├── user-actions-dropdown.tsx     # Individual user action menu
│   ├── user-bulk-actions.tsx         # Bulk operations interface
│   ├── user-advanced-filters.tsx     # Advanced search and filtering
│   ├── user-create-dialog.tsx        # New user creation form
│   └── user-edit-dialog.tsx          # User editing interface
└── README.md                         # This documentation
```

## API Integration

The system integrates with the following API endpoints:

- `GET /api/v1/admin/users` - List users with filtering and pagination
- `GET /api/v1/admin/users/:id` - Get detailed user information
- `PUT /api/v1/admin/users/:id` - Update user information
- `PUT /api/v1/admin/users/:id/status` - Update user status
- `GET /api/v1/admin/users/:id/activity` - Get user activity logs
- `GET /api/v1/admin/users/:id/sessions` - Get user sessions
- `DELETE /api/v1/admin/users/:id/sessions/:sessionId` - Terminate session
- `POST /api/v1/admin/users/:id/reset-password` - Reset user password
- `POST /api/v1/admin/users/:id/impersonate` - Generate impersonation token
- `GET /api/v1/admin/users/statistics` - Get user statistics

## Usage

### Accessing User Management

Navigate to `/admin/users` in the admin console to access the user management interface.

### Managing Users

1. **View Users**: Browse the paginated user list with real-time statistics
2. **Search & Filter**: Use the advanced filtering system to find specific users
3. **Bulk Operations**: Select multiple users for bulk actions
4. **Individual Actions**: Use the action dropdown for individual user management
5. **Create Users**: Click "Create User" to add new platform users
6. **View Details**: Click "View Details" to see comprehensive user information

### Security Considerations

- All user actions are logged for audit purposes
- Sensitive operations require confirmation dialogs
- Session management provides security oversight
- Role-based permissions control access levels
- Impersonation is logged and time-limited

## Future Enhancements

- **Advanced Analytics**: User behavior analytics and insights
- **Automated Workflows**: Automated user lifecycle management
- **Integration APIs**: Third-party identity provider integration
- **Mobile Support**: Responsive design improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Advanced Permissions**: Custom permission sets and inheritance
