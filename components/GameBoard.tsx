import { Flag } from "lucide-react";

type GameBoardProps = {
  ropePosition: number;
  myRole: 1 | 2;
  winner: 1 | 2 | null;
  player1Name: string;
  player2Name: string;
};

export function GameBoard({ ropePosition, myRole, winner, player1Name, player2Name }: GameBoardProps) {
  const myProgress = myRole === 1 ? ropePosition : 100 - ropePosition;
  const enemyProgress = 100 - myProgress;
  const pulledTowardPlayer1 = ropePosition >= 50;
  const pullLeft = Math.min(ropePosition, 50);
  const pullWidth = Math.abs(ropePosition - 50);

  return (
    <section className="chalk-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-200">
        <span>You: {Math.round(myProgress)}% muscle</span>
        <span>Opponent: {Math.round(enemyProgress)}% panic</span>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
        <span className="text-rose-300">{player2Name}</span>
        <span className="text-cyan-300">{player1Name}</span>
      </div>

      <div className="relative h-9 w-full overflow-hidden rounded-full border-2 border-yellow-300 bg-slate-900">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-rose-700" aria-hidden="true" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-cyan-700" aria-hidden="true" />

        <div
          className="absolute top-1/2 h-[4px] w-full -translate-y-1/2 bg-yellow-200"
          aria-hidden="true"
        />
        <div
          className={`absolute top-1/2 h-[8px] -translate-y-1/2 rounded-full transition-all duration-150 ${
            pulledTowardPlayer1 ? "bg-cyan-300" : "bg-rose-300"
          }`}
          style={{ left: `${pullLeft}%`, width: `${pullWidth}%` }}
          aria-hidden="true"
        />

        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-yellow-100" />

        <div
          className={`floaty absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-200 transition-all duration-150 ${
            pulledTowardPlayer1 ? "scale-x-[-1]" : ""
          }`}
          style={{ left: `${ropePosition}%` }}
          aria-label="rope marker"
        >
          <Flag className="h-6 w-6" />
        </div>
      </div>

      {winner ? (
        <p className="mt-3 text-sm font-semibold text-slate-100">
          {winner === myRole
            ? "Victory: your calculator aura was terrifying."
            : "Defeat: their brain did push-ups before this match."}
        </p>
      ) : null}
    </section>
  );
}
