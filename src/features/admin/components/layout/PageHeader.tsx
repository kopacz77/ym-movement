import { AdminBreadcrumbs } from "./AdminBreadCrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/**
 * PageHeader combines the breadcrumb navigation with the page title and optional description.
 */
export const PageHeader = ({ title, description, children }: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <AdminBreadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};
