import { EntryEditorPage } from "../../_entries/EntryEditor";

export const metadata = { title: "Edit" };

export default function Page({ params }: PageProps<"/admin/services/[id]">) {
  return <EntryEditorPage typeId="service" params={params} />;
}
