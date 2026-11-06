const Spinner = ({ label = "Loading..." }: { label?: string }) => (
  <div
    role="status"
    className="flex items-center justify-center gap-3 py-10 text-sm text-fg-subtle"
  >
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-brand"
      aria-hidden="true"
    />
    {label}
  </div>
);

export default Spinner;
