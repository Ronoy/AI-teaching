import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<Props & { t: (key: string) => string }, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    const { t } = this.props;

    if (this.state.hasError) {
      let errorMessage = t("unexpectedError");
      let errorDetails = "";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = t("dbAccessDenied");
            errorDetails = `${t("operation")}: ${parsed.operationType} ${t("on")} ${parsed.path}. ${t("checkPermissions")}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-rose-100">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{errorMessage}</h1>
            <p className="text-slate-500 mb-6">{errorDetails || t("somethingWentWrong")}</p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <RefreshCcw className="w-5 h-5" />
              {t("reloadApp")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary = ({ children }: Props) => {
  const { t } = useLanguage();
  return <ErrorBoundaryInner t={t}>{children}</ErrorBoundaryInner>;
};

export default ErrorBoundary;
