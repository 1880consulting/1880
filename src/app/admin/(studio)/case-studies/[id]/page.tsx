import { EntryEditorPage } from "../../_entries/EntryEditor";

export const metadata = { title: "Edit" };

export default function Page({ params }: PageProps<"/admin/case-studies/[id]">) {
  return <EntryEditorPage typeId="work" params={params} />;
}
