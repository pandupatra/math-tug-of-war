export type Operator = "+" | "-" | "*";

export type MathProblem = {
  a: number;
  b: number;
  op: Operator;
  text: string;
  nonce: string;
};

export type SessionStatus = "waiting" | "active" | "finished";

export type GameSession = {
  id: string;
  status: SessionStatus;
  rope_position: number;
  step_size: number;
  winner: 1 | 2 | null;
  player1_token: string;
  player1_name: string;
  player2_token: string | null;
  player2_name: string | null;
  current_problem: MathProblem;
  version: number;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlayerRole = 1 | 2;

export type DailyLeaderboardEntry = {
  day: string;
  player_name: string;
  wins: number;
  losses: number;
  matches: number;
  updated_at: string;
};
