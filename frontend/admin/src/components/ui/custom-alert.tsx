import { cn } from "@/lib/utils";
import React from "react";

type CustomAlertProps = {
  type?: "info" | "warning" | "error" | "success";
  message?: string;
  children?: any;
  className?: string;
  Icon?: React.FC<React.SVGProps<SVGSVGElement>> | null;
};

function CustomAlert({
  type,
  className,
  message,
  Icon,
  children,
}: CustomAlertProps) {
  const getIcon = () => {
    switch (type) {
      case "info":
        return "ℹ️"; // Info icon
      case "warning":
        return "⚠️"; // Warning icon
      case "error":
        return "❌"; // Error icon
      case "success":
        return "✅"; // Success icon
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        `p-4 flex items-start gap-4 bg-muted text-foreground rounded-lg mb-4`,
        {
          "bg-blue-600 text-white border border-blue-700 dark:bg-blue-50 dark:text-blue-800 dark:border-blue-200":
            type === "info",
          "bg-yellow-600 text-white border border-yellow-700 dark:bg-yellow-50 dark:text-yellow-800 dark:border-yellow-200":
            type === "warning",
          "bg-red-600 text-white border border-red-700 dark:bg-red-50 dark:text-red-800 dark:border-red-200":
            type === "error",
          "bg-green-600 text-white border border-green-700 dark:bg-green-50 dark:text-green-800 dark:border-green-200":
            type === "success",
        },
        className,
      )}
    >
      {Icon ? <Icon className="w-6 h-6" /> : getIcon()}
      <div>{message || children}</div>
    </div>
  );
}

export default CustomAlert;
