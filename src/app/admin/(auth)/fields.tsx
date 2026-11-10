import { controls as c } from "@/cms/ui/client";

/** A labeled input in the 1880 OS style. */
export function Field({
  label,
  hint,
  ...input
}: React.ComponentProps<"input"> & { label: string; hint?: string; name: string }) {
  const id = `f-${input.name}`;
  return (
    <div className={c.field}>
      <label htmlFor={id} className={c.label}>
        {label}
      </label>
      <input
        id={id}
        className={c.input}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className={c.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ status, message }: { status: string; message?: string }) {
  if (status !== "error" || !message) return null;
  return (
    <p className={c.error} role="alert" style={{ marginBottom: 16 }}>
      {message}
    </p>
  );
}
