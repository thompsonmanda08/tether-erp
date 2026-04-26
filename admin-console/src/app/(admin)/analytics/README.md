# Analytics Dashboard System

A comprehensive analytics dashboard system for the admin console that provides detailed insights into platform usage, user behavior, organization metrics, revenue analytics, and system performance.

## Overview

The Analytics Dashboard System is a complete solution for monitoring and analyzing platform performance across multiple dimensions. It provides real-time data visualization, advanced filtering capabilities, and export functionality for comprehensive business intelligence.

## Features

### Core Analytics Modules

1. **Overview Analytics**
   - Platform-wide key performance indicators
   - Growth metrics and trends
   - High-level summary statistics
   - Real-time performance indicators

2. **User Analytics**
   - User growth trends and demographics
   - Engagement metrics (DAU, WAU, MAU)
   - User role and status distribution
   - Session analytics and behavior patterns

3. **Organization Analytics**
   - Organization growth and distribution
   - Subscription tier analysis
   - Trial metrics and conversion rates
   - Organization size distribution

4. **Revenue Analytics**
   - Revenue trends and forecasting
   - Monthly/Annual Recurring Revenue (MRR/ARR)
   - Revenue by subscription tier
   - Financial health metrics (ARPU, LTV, Churn, NRR)

5. **Usage Analytics**
   - API usage patterns and trends
   - Feature adoption and usage statistics
   - Performance metrics (response time, error rate, uptime)
   - System load and capacity analysis

### Advanced Features

- **Real-time Data Updates**: Auto-refresh functionality with configurable intervals
- **Advanced Filtering**: Date ranges, organization filters, subscription tiers, user roles
- **Export Capabilities**: CSV, Excel, and PDF export options
- **Interactive Charts**: Responsive charts with tooltips and legends using Recharts
- **Performance Monitoring**: System health indicators and alerts
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

## File Structure

```
admin-console/src/app/admin/analytics/
├── page.tsx                           # Main analytics dashboard page
├── components/
│   ├── analytics-filters.tsx          # Advanced filtering component
│   ├── metrics-grid.tsx               # Overview metrics grid
│   ├── user-analytics-chart.tsx       # User analytics visualizations
│   ├── organization-analytics-chart.tsx # Organization analytics charts
│   ├── revenue-analytics-chart.tsx    # Revenue analytics and financial metrics
│   └── usage-analytics-chart.tsx      # Usage and performance analytics
└── README.md                          # This documentation file
```

## Components

### Main Page (`page.tsx`)

The main analytics dashboard page that orchestrates all analytics modules:

- **State Management**: Manages loading states, data, and filters
- **Data Loading**: Fetches analytics data from multiple endpoints
- **Tab Navigation**: Provides tabbed interface for different analytics views
- **Real-time Updates**: Handles data refresh and auto-update functionality

### Analytics Filters (`analytics-filters.tsx`)

Advanced filtering system with:

- **Date Range Selection**: Predefined ranges (7d, 30d, 90d, 1y) and custom date picker
- **Advanced Filters**: Organization, subscription tier, user role, and status filters
- **Export Options**: Multiple export formats with filtered data
- **Filter Management**: Active filter display and reset functionality

### Metrics Grid (`metrics-grid.tsx`)

Overview metrics display featuring:

- **Key Performance Indicators**: Total users, organizations, revenue, subscriptions
- **Growth Metrics**: Trend indicators with color-coded growth rates
- **Real-time Updates**: Live data with loading states
- **Responsive Layout**: Adaptive grid layout for different screen sizes

### User Analytics Chart (`user-analytics-chart.tsx`)

Comprehensive user analytics including:

- **Growth Trends**: User acquisition and retention over time
- **Demographics**: User distribution by role and status
- **Engagement Metrics**: DAU/WAU/MAU ratios and session analytics
- **Interactive Charts**: Area charts, pie charts, and bar charts

### Organization Analytics Chart (`organization-analytics-chart.tsx`)

Organization-focused analytics featuring:

- **Growth Tracking**: Organization acquisition trends
- **Subscription Analysis**: Distribution by subscription tiers
- **Trial Metrics**: Trial conversion rates and funnel analysis
- **Size Distribution**: Organization segmentation by user count

### Revenue Analytics Chart (`revenue-analytics-chart.tsx`)

Financial analytics and revenue tracking:

- **Revenue Trends**: Historical revenue growth and forecasting
- **Subscription Revenue**: MRR/ARR tracking and analysis
- **Financial Metrics**: ARPU, LTV, churn rate, and NRR
- **Revenue Health**: Performance indicators and alerts

### Usage Analytics Chart (`usage-analytics-chart.tsx`)

System usage and performance analytics:

- **Usage Patterns**: API requests, active sessions, and user activity
- **Feature Analytics**: Feature adoption rates and usage statistics
- **Performance Monitoring**: Response times, error rates, and uptime
- **System Health**: Capacity utilization and performance indicators

## API Integration

### Analytics Actions (`_actions/analytics.ts`)

The analytics system integrates with backend APIs through server actions:

```typescript
// Overview analytics
getAnalyticsOverview(filters?: AnalyticsFilters)

// User analytics
getUserAnalytics(filters?: AnalyticsFilters)

// Organization analytics
getOrganizationAnalytics(filters?: AnalyticsFilters)

// Revenue analytics
getRevenueAnalytics(filters?: AnalyticsFilters)

// Usage analytics
getUsageAnalytics(filters?: AnalyticsFilters)

// Export functionality
exportAnalyticsReport(type, format, filters?)
```

### Data Types

Comprehensive TypeScript interfaces for type safety:

- `AnalyticsOverview`: Platform-wide metrics and KPIs
- `UserAnalytics`: User behavior and engagement data
- `OrganizationAnalytics`: Organization metrics and distribution
- `RevenueAnalytics`: Financial data and revenue metrics
- `UsageAnalytics`: System usage and performance data
- `AnalyticsFilters`: Filtering options and parameters

## Usage Examples

### Basic Usage

```tsx
import { AnalyticsPage } from "./page";

// The analytics dashboard is automatically loaded with default filters
<AnalyticsPage />;
```

### Custom Filtering

```tsx
// Apply custom filters
const filters = {
  date_range: "30d",
  subscription_tier: "enterprise",
  organization_id: "org-123",
};

// Filters are applied through the UI components
```

### Export Analytics

```tsx
// Export analytics data
await exportAnalyticsReport("revenue", "csv", filters);
```

## Styling and Theming

The analytics dashboard uses:

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui Components**: Consistent UI component library
- **Recharts**: Data visualization library
- **Lucide Icons**: Icon system for consistent iconography

### Color Scheme

- **Primary Colors**: Blue (#0088FE), Green (#00C49F), Yellow (#FFBB28)
- **Status Colors**: Success (green), Warning (yellow), Error (red)
- **Chart Colors**: Predefined color palette for consistent visualization

## Performance Considerations

### Optimization Strategies

1. **Data Fetching**: Parallel API calls for improved loading performance
2. **Caching**: Client-side caching of analytics data
3. **Lazy Loading**: Components loaded on-demand
4. **Responsive Charts**: Optimized chart rendering for different screen sizes

### Loading States

- **Skeleton Loading**: Animated placeholders during data loading
- **Progressive Loading**: Incremental data loading for better UX
- **Error Handling**: Graceful error states with retry options

## Accessibility

The analytics dashboard includes:

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and descriptions
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Proper focus handling for interactive elements

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: Responsive design for mobile devices
- **Progressive Enhancement**: Graceful degradation for older browsers

## Development

### Adding New Analytics

1. **Define Data Types**: Add TypeScript interfaces for new analytics data
2. **Create API Actions**: Implement server actions for data fetching
3. **Build Components**: Create visualization components using Recharts
4. **Update Main Page**: Integrate new analytics into the dashboard
5. **Add Documentation**: Update this README with new features

### Testing

```bash
# Run component tests
npm run test

# Run integration tests
npm run test:integration

# Run accessibility tests
npm run test:a11y
```

### Code Quality

- **TypeScript**: Full type safety throughout the codebase
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting standards
- **Husky**: Pre-commit hooks for code quality

## Troubleshooting

### Common Issues

1. **Data Loading Errors**
   - Check API endpoint availability
   - Verify authentication tokens
   - Review network connectivity

2. **Chart Rendering Issues**
   - Ensure data format matches chart requirements
   - Check for null/undefined data values
   - Verify responsive container setup

3. **Performance Issues**
   - Monitor API response times
   - Check for memory leaks in chart components
   - Optimize data processing logic

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Set environment variable
NEXT_PUBLIC_DEBUG_ANALYTICS = true;
```

## Future Enhancements

### Planned Features

1. **Real-time Streaming**: WebSocket integration for live data updates
2. **Custom Dashboards**: User-configurable dashboard layouts
3. **Advanced Analytics**: Machine learning insights and predictions
4. **Alerting System**: Automated alerts for metric thresholds
5. **Data Export API**: Programmatic data export capabilities

### Integration Opportunities

- **Business Intelligence Tools**: Integration with BI platforms
- **Notification Systems**: Alert integration with communication tools
- **External Analytics**: Integration with Google Analytics, Mixpanel
- **Reporting Automation**: Scheduled report generation and distribution

## Support

For technical support or feature requests:

1. **Documentation**: Check this README and component documentation
2. **Code Review**: Review component implementations for examples
3. **Issue Tracking**: Use the project issue tracker for bug reports
4. **Development Team**: Contact the development team for assistance

---

_Last updated: February 2026_
_Version: 1.0.0_
