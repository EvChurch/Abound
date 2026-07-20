import { CommunicationAutomationsWorkspace } from "@/components/communications/automation-workspace";

export const metadata = {
  title: "Communications",
};

export default async function CommunicationsPage() {
  return CommunicationAutomationsWorkspace();
}
