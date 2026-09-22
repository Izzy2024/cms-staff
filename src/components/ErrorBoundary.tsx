import { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui/button.tsx";
import { MensajeError } from "./MensajeError.tsx";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  tieneError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { tieneError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { tieneError: true };
  }

  componentDidCatch(error: unknown): void {
    // ponytail: aqui se conecta Sentry cuando se despliegue.
    console.error(error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.tieneError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ tieneError: false });
    }
  }

  render(): ReactNode {
    if (this.state.tieneError) {
      return (
        <div className="flex flex-col gap-4">
          <MensajeError>Algo salió mal al mostrar esta pantalla.</MensajeError>
          <Button type="button" onClick={() => window.location.reload()} className="self-start">
            Recargar la página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
