interface Props {
  revealed: boolean;
  onReveal: () => void;
  onGotIt: () => void;
  onMissed: () => void;
}

export function ActionButtons({ revealed, onReveal, onGotIt, onMissed }: Props) {
  if (!revealed) {
    return (
      <div className="actions">
        <button className="btn-primary" onClick={onReveal}>
          Reveal
        </button>
      </div>
    );
  }

  return (
    <div className="actions">
      <div className="actions-row">
        <button className="btn-missed" onClick={onMissed}>
          Missed
        </button>
        <button className="btn-got-it" onClick={onGotIt}>
          Got It
        </button>
      </div>
    </div>
  );
}
