import { Flag } from "lucide-react";

type GameBoardProps = {
  ropePosition: number;
  myRole: 1 | 2;
  winner: 1 | 2 | null;
};

export function GameBoard({ ropePosition, myRole, winner }: GameBoardProps) {
  const myProgress = myRole === 1 ? ropePosition : 100 - ropePosition;
  const enemyProgress = 100 - myProgress;

  return (
    <section className="chalk-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-white/70">
        <span>You: {Math.round(myProgress)}% muscle</span>
        <span>Opponent: {Math.round(enemyProgress)}% panic</span>
      </div>

      <div className="relative h-9 w-full overflow-hidden rounded-full border border-white/25 bg-[#07111f]/70">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#2fe8ff] to-[#ffd84d] transition-all duration-150"
          style={{ width: `${ropePosition}%` }}
        />

        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/75" />

        <div
          className="floaty absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#ff8c8c] transition-all duration-150"
          style={{ left: `${ropePosition}%` }}
          aria-label="rope marker"
        >
          <Flag className="h-6 w-6" />
        </div>
      </div>

      {winner ? (
        <p className="mt-3 text-sm font-semibold text-white">
          {winner === myRole
            ? "Victory: your calculator aura was terrifying."
            : "Defeat: their brain did push-ups before this match."}
        </p>
      ) : null}
    </section>
  );
}
