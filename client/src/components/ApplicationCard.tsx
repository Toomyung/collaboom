import { ApplicationWithDetails } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ApplicationCardProps {
  application: ApplicationWithDetails;
  onCancelApplication?: () => void;
  onReportIssue?: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock; description: string }
> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
    description: "Awaiting approval from our team",
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
    description: "Your application has been approved! Shipping will begin soon.",
  },
  rejected: {
    label: "Not Selected",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
    description: "Unfortunately, you were not selected for this campaign.",
  },
  shipped: {
    label: "Shipped",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Truck,
    description: "Your package is on the way!",
  },
  delivered: {
    label: "Delivered",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: Package,
    description: "Package delivered. Please upload your content by the deadline.",
  },
  uploaded: {
    label: "Content Uploaded",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Upload,
    description: "Your content has been submitted for verification.",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle,
    description: "Campaign completed successfully!",
  },
  deadline_missed: {
    label: "Deadline Missed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertCircle,
    description: "The upload deadline has passed.",
  },
};

export function ApplicationCard({
  application,
  onCancelApplication,
  onReportIssue,
}: ApplicationCardProps) {
  const campaign = application.campaign;
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const deadline = new Date(campaign.deadline);
  const isDeadlineSoon =
    application.status === "delivered" &&
    deadline.getTime() - Date.now() < 48 * 60 * 60 * 1000;

  return (
    <Card
      className="overflow-hidden"
      data-testid={`card-application-${application.id}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Campaign Image */}
        <div className="relative w-full sm:w-40 h-32 sm:h-auto flex-shrink-0 overflow-hidden bg-muted">
          {campaign.imageUrl ? (
            <img
              src={campaign.imageUrl}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Package className="h-8 w-8 text-primary/40" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4">
          <CardHeader className="p-0 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {campaign.brandName}
                </p>
                <h3 className="font-semibold text-lg leading-tight">
                  {campaign.name}
                </h3>
              </div>
              <Badge className={cn("flex-shrink-0", status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            <p className="text-sm text-muted-foreground">{status.description}</p>

            {/* Deadline warning */}
            {isDeadlineSoon && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Upload deadline: {format(deadline, "MMM d, h:mm a")} PST
                </span>
              </div>
            )}

            {/* Shipping info */}
            {application.shipping && application.status !== "pending" && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {application.shipping.trackingNumber && (
                  <span>
                    Tracking: <span className="font-medium">{application.shipping.trackingNumber}</span>
                  </span>
                )}
                {application.shipping.courier && (
                  <span>
                    Courier: <span className="font-medium">{application.shipping.courier}</span>
                  </span>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Applied: {format(new Date(application.appliedAt!), "MMM d, yyyy")}</span>
              {application.approvedAt && (
                <span>
                  Approved: {format(new Date(application.approvedAt), "MMM d, yyyy")}
                </span>
              )}
              <span>Deadline: {format(deadline, "MMM d, yyyy")} PST</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {campaign.guidelinesUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-guidelines-${application.id}`}
                >
                  <a href={campaign.guidelinesUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Guidelines
                  </a>
                </Button>
              )}

              {application.status === "pending" && onCancelApplication && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelApplication}
                  data-testid={`button-cancel-${application.id}`}
                >
                  Cancel Application
                </Button>
              )}

              {(application.status === "shipped" || application.status === "delivered") &&
                onReportIssue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReportIssue}
                    data-testid={`button-report-${application.id}`}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Report Issue
                  </Button>
                )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
