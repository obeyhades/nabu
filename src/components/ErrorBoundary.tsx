import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "../lib/errors";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Fångar renderingsfel och visar en barnvänlig fallback i stället för vit skärm. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError("ErrorBoundary", { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-6xl">🙈</div>
          <h1 className="text-2xl font-bold">Oj! Något gick fel</h1>
          <p className="text-zinc-500">Ingen fara — vi provar igen.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-purple-500 px-6 py-3 font-semibold text-white shadow-lg active:scale-95"
          >
            Försök igen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
