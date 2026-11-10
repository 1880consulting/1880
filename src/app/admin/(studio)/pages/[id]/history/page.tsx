import { EntryHistoryPage } from "../../../_entries/EntryHistory";

export const metadata = { title: "History" };

export default function Page({ params }: PageProps<"/admin/pages/[id]/history">) {
  return <EntryHistoryPage typeId="page" params={params} />;
}
