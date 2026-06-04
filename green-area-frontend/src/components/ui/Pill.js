export default function Pill({ active, onClick, children, disabled }) {
  return (
    <button
      type="button"
      className="chip"
      data-active={active}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
