// ============================================================================
// ERROR BOUNDARY COMPONENT
// Catches JavaScript errors in child component tree and displays fallback UI
// ============================================================================

import React, { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/theme-tokens';
import { useTheme } from '../contexts/ThemeContext';
import { reportError } from '../utils/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Functional fallback UI that uses theme hooks
function ErrorFallbackUI({
  error,
  errorInfo,
  onRetry,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{'\uD83D\uDE14'}</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          We're sorry, but something unexpected happened. Please try again.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onRetry}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>

        {__DEV__ && error && (
          <ScrollView style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>
              {error.toString()}
            </Text>
            {errorInfo && (
              <Text style={styles.debugText}>
                {errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    reportError(error, {
      component: 'ErrorBoundary',
      screenName: this.props.screenName || 'unknown',
      componentStack: errorInfo.componentStack || 'unknown',
    });
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: c.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonText: {
    color: c.background,
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: c.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.error,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: c.textMuted,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
