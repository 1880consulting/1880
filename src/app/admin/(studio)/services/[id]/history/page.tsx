import { EntryHistoryPage } from "../../../_entries/EntryHistory";

export const metadata = { title: "History" };

export default function Page({ params }: PageProps<"/admin/services/[id]/history">) {
  return <EntryHistoryPage typeId="service" params={params} />;
}
