import { EntryHistoryPage } from "../../../_entries/EntryHistory";

export const metadata = { title: "History" };

export default function Page({ params }: PageProps<"/admin/case-studies/[id]/history">) {
  return <EntryHistoryPage typeId="work" params={params} />;
}
