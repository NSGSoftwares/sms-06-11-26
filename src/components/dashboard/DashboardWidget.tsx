import type { ReactNode } from "react";

interface DashboardWidgetProps {
    children: ReactNode;
    className?: string;
}

const DashboardWidget = ({
    children,
    className = "",
}: DashboardWidgetProps) => {
    return (
        <div className={className}>
            {children}
        </div>
    );
};

export default DashboardWidget;