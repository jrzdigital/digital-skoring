import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Terjadi kesalahan sistem yang tidak terduga.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public handleResetRecovery = () => {
    try {
      localStorage.removeItem("ipsi_match_state");
      this.setState({ hasError: false, errorMessage: '' });
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#04040a] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 sm:p-8 bg-zinc-950/90 border border-red-900/60 rounded-2xl shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/50 border border-red-800/80 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">Terjadi Gangguan Tampilan</h2>
              <p className="text-xs text-zinc-400">
                Aplikasi telah mengamankan data Anda. Silakan klik tombol di bawah untuk memuat kembali sistem.
              </p>
              {this.state.errorMessage && (
                <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 text-[11px] text-red-400/90 font-mono break-all text-left">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleResetRecovery}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
