import * as React from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useGridStyles } from "../../../themes";

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: VoidFunction }) {
  const { errorFallback } = useGridStyles();

  return (
    <SafeAreaView style={errorFallback.container}>
      <View style={errorFallback.content}>
        <Text style={errorFallback.title}>Oops!</Text>
        <Text style={errorFallback.subtitle}>There&apos;s an error</Text>
        <Text style={errorFallback.error}>{error?.toString()}</Text>
        <TouchableOpacity style={errorFallback.button} onPress={onReset}>
          <Text style={errorFallback.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} onReset={this.resetError} />;
    }
    return this.props.children;
  }
}
