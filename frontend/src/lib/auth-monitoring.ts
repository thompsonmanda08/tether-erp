/**
 * Authentication and Organization Selection Monitoring
 * Tracks race conditions and performance metrics in production
 */

interface AuthMetrics {
  sessionVerificationFailures: number;
  organizationFetchFailures: number;
  redirectLoops: number;
  tokenRefreshConflicts: number;
  organizationSwitchFailures: number;
  averageLoginToOrgTime: number[];
}

interface AuthEvent {
  type:
    | "session_verification_failure"
    | "organization_fetch_failure"
    | "redirect_loop"
    | "token_refresh_conflict"
    | "organization_switch_failure"
    | "login_to_org_timing";
  timestamp: number;
  details?: any;
  userId?: string;
  organizationId?: string;
}

class AuthMonitor {
  private metrics: AuthMetrics = {
    sessionVerificationFailures: 0,
    organizationFetchFailures: 0,
    redirectLoops: 0,
    tokenRefreshConflicts: 0,
    organizationSwitchFailures: 0,
    averageLoginToOrgTime: [],
  };

  private events: AuthEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private redirectHistory: { path: string; timestamp: number }[] = [];
  private loginStartTime: number | null = null;

  /**
   * Track session verification failure
   */
  trackSessionVerificationFailure(error: any, userId?: string) {
    this.metrics.sessionVerificationFailures++;
    this.addEvent({
      type: "session_verification_failure",
      timestamp: Date.now(),
      details: { error: error.message || error },
      userId,
    });

    // Alert if failure rate is high
    if (this.getSessionVerificationFailureRate() > 0.05) {
      // 5%
      this.sendAlert("High session verification failure rate detected");
    }
  }

  /**
   * Track organization fetch failure
   */
  trackOrganizationFetchFailure(error: any, userId?: string) {
    this.metrics.organizationFetchFailures++;
    this.addEvent({
      type: "organization_fetch_failure",
      timestamp: Date.now(),
      details: { error: error.message || error },
      userId,
    });

    // Alert if failure rate is high
    if (this.getOrganizationFetchFailureRate() > 0.02) {
      // 2%
      this.sendAlert("High organization fetch failure rate detected");
    }
  }

  /**
   * Track redirect loop detection
   */
  trackRedirect(path: string) {
    const now = Date.now();
    this.redirectHistory.push({ path, timestamp: now });

    // Keep only last 10 redirects
    this.redirectHistory = this.redirectHistory.slice(-10);

    // Detect redirect loops (3+ welcome page visits in 30 seconds)
    const recentWelcomeVisits = this.redirectHistory.filter(
      (r) => r.path === "/welcome" && now - r.timestamp < 30000
    );

    if (recentWelcomeVisits.length >= 3) {
      this.metrics.redirectLoops++;
      this.addEvent({
        type: "redirect_loop",
        timestamp: now,
        details: { redirectHistory: this.redirectHistory },
      });

      this.sendAlert("Redirect loop detected");
    }
  }

  /**
   * Track token refresh conflict
   */
  trackTokenRefreshConflict(details: any) {
    this.metrics.tokenRefreshConflicts++;
    this.addEvent({
      type: "token_refresh_conflict",
      timestamp: Date.now(),
      details,
    });
  }

  /**
   * Track organization switch failure
   */
  trackOrganizationSwitchFailure(error: any, orgId: string, userId?: string) {
    this.metrics.organizationSwitchFailures++;
    this.addEvent({
      type: "organization_switch_failure",
      timestamp: Date.now(),
      details: { error: error.message || error },
      userId,
      organizationId: orgId,
    });
  }

  /**
   * Start tracking login timing
   */
  startLoginTiming() {
    this.loginStartTime = Date.now();
  }

  /**
   * End login timing when organization is accessed
   */
  endLoginTiming(organizationId?: string) {
    if (this.loginStartTime) {
      const duration = Date.now() - this.loginStartTime;
      this.metrics.averageLoginToOrgTime.push(duration);

      // Keep only last 100 measurements
      if (this.metrics.averageLoginToOrgTime.length > 100) {
        this.metrics.averageLoginToOrgTime =
          this.metrics.averageLoginToOrgTime.slice(-100);
      }

      this.addEvent({
        type: "login_to_org_timing",
        timestamp: Date.now(),
        details: { duration },
        organizationId,
      });

      // Alert if average time is too high
      const avgTime = this.getAverageLoginToOrgTime();
      if (avgTime > 3000) {
        // 3 seconds
        this.sendAlert(`High login-to-organization access time: ${avgTime}ms`);
      }

      this.loginStartTime = null;
    }
  }

  /**
   * Get session verification failure rate (last 100 events)
   */
  private getSessionVerificationFailureRate(): number {
    const recentEvents = this.events.slice(-100);
    const failures = recentEvents.filter(
      (e) => e.type === "session_verification_failure"
    ).length;
    return failures / Math.max(recentEvents.length, 1);
  }

  /**
   * Get organization fetch failure rate (last 100 events)
   */
  private getOrganizationFetchFailureRate(): number {
    const recentEvents = this.events.slice(-100);
    const failures = recentEvents.filter(
      (e) => e.type === "organization_fetch_failure"
    ).length;
    return failures / Math.max(recentEvents.length, 1);
  }

  /**
   * Get average login to organization access time
   */
  private getAverageLoginToOrgTime(): number {
    if (this.metrics.averageLoginToOrgTime.length === 0) return 0;

    const sum = this.metrics.averageLoginToOrgTime.reduce((a, b) => a + b, 0);
    return sum / this.metrics.averageLoginToOrgTime.length;
  }

  /**
   * Add event to history
   */
  private addEvent(event: AuthEvent) {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Send alert (in production, this would integrate with monitoring service)
   */
  private sendAlert(message: string) {
    console.warn(`[AUTH MONITOR ALERT] ${message}`);

    // In production, integrate with monitoring service:
    // - Sentry
    // - DataDog
    // - New Relic
    // - Custom webhook

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      // Example: Send to monitoring service
      // fetch('/api/monitoring/alert', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message, metrics: this.metrics })
      // });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): AuthMetrics & { averageLoginTime: number } {
    return {
      ...this.metrics,
      averageLoginTime: this.getAverageLoginToOrgTime(),
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): AuthEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      sessionVerificationFailures: 0,
      organizationFetchFailures: 0,
      redirectLoops: 0,
      tokenRefreshConflicts: 0,
      organizationSwitchFailures: 0,
      averageLoginToOrgTime: [],
    };
    this.events = [];
    this.redirectHistory = [];
    this.loginStartTime = null;
  }
}

// Global monitor instance
export const authMonitor = new AuthMonitor();

// Convenience functions for common tracking scenarios
export const trackPageRedirect = (path: string) => {
  authMonitor.trackRedirect(path);
};

export const trackOrgSwitchError = (
  error: any,
  orgId: string,
  userId?: string
) => {
  authMonitor.trackOrganizationSwitchFailure(error, orgId, userId);
};

export const startLoginTimer = () => {
  authMonitor.startLoginTiming();
};

