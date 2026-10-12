import React from "react";
import { SystemFlowVisualizer } from "@/components/workflow/system-flow-visualizer";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Platform Operations & Role Workflow Guide | Dhruto",
  description: "Comprehensive step-by-step operational lifecycle for Customers, Merchants, Hub Managers, and Riders.",
};

export default function WorkflowPage() {
  return (
    <div className="dhruto-container py-8 space-y-6">
      <PageHeader
        title="Dhruto Operations & Workflow Guide"
        description="Explore how every feature, role lifecycle, and automated courier handshake functions from end to end."
      />
      <SystemFlowVisualizer />
    </div>
  );
}
