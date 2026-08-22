import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[HESICS ErrorBoundary Caught Error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopy = () => {
    const details = `[HESICS Exception]\n${this.state.error?.name}: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack || ""}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const isMissingEnv =
        this.state.error?.message?.includes("Missing required environment variables") ||
        this.state.error?.message?.includes("Firebase Startup Error") ||
        this.state.error?.message?.includes("Firebase configuration missing");

      return (
        <div className="min-h-screen w-full bg-[#050505] text-[#E0E0E6] flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="w-full max-w-xl bg-[#09090C] border border-[#1A1A22] rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-[#F4F4F6] tracking-tight">
                    {isMissingEnv ? "Configuration Error" : "System Exception"}
                  </h1>
                  <p className="text-xs text-[#707080]">
                    HESICS Business Operating System
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono rounded-full font-medium uppercase tracking-wider">
                Crash Intercepted
              </span>
            </div>

            <div className="p-4 bg-[#050507] border border-[#171720] rounded-2xl space-y-2">
              <div className="text-xs font-mono text-red-300 break-words font-semibold">
                {this.state.error?.name || "Error"}: {this.state.error?.message || "An unexpected error occurred."}
              </div>
              {isMissingEnv && (
                <div className="text-[11px] text-[#A0A0B0] pt-2 border-t border-[#1C1C26] leading-relaxed">
                  Required Firebase credentials are not configured in your environment.
                  If deploying on Vercel, go to <span className="text-[#1E9EFF] font-mono">Settings &rarr; Environment Variables</span>,
                  add the missing <span className="text-white font-mono font-medium">VITE_FIREBASE_*</span> variables for Production, and redeploy.
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-[#F4F4F6] hover:bg-white text-black font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/5 active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Application
              </button>
              <button
                onClick={this.handleCopy}
                className="py-3 px-4 bg-[#111116] hover:bg-[#181820] text-[#A0A0B2] hover:text-white border border-[#22222E] rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                title="Copy error details to clipboard"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Trace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
