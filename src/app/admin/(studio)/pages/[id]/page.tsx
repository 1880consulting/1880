import { EntryEditorPage } from "../../_entries/EntryEditor";

export const metadata = { title: "Edit" };

export default function Page({ params }: PageProps<"/admin/pages/[id]">) {
  return <EntryEditorPage typeId="page" params={params} />;
}
