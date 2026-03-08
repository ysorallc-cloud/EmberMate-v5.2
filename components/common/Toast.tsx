// ============================================================================
// TOAST NOTIFICATION COMPONENT
// Shows success, error, info, and warning messages
// ============================================================================

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme/theme-tokens';
import { useTheme } from '../../contexts/ThemeContext';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const getToastConfig = (c: typeof Colors): Record<ToastType, { icon: string; color: string; bgColor: string; borderColor: string }> => ({
  success: {
    icon: '✓',
    color: c.green,
    bgColor: c.greenLight,
    borderColor: c.greenBorder,
  },
  error: {
    icon: '!',
    color: c.red,
    bgColor: c.redLight,
    borderColor: c.redBorder,
  },
  warning: {
    icon: '⚠',
    color: c.amber,
    bgColor: c.amberLight,
    borderColor: c.amberBorder,
  },
  info: {
    icon: 'ℹ',
    color: c.accent,
    bgColor: c.accentLight,
    borderColor: c.accentBorder,
  },
});

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onDismiss,
  action,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toastConfig = useMemo(() => getToastConfig(colors), [colors]);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const config = toastConfig[type];

  useEffect(() => {
    if (visible) {
      // Announce to screen readers
      AccessibilityInfo.announceForAccessibility(`${type}: ${message}`);

      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss (unless it's an error which needs explicit dismissal)
      if (type !== 'error' && duration > 0) {
        timerRef.current = setTimeout(() => {
          hideToast();
        }, duration);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, type, duration]);

  const hideToast = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleAction = () => {
    if (action) {
      action.onPress();
      hideToast();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${type} notification: ${message}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>

      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      <View style={styles.actions}>
        {action && (
          <TouchableOpacity
            onPress={handleAction}
            style={styles.actionButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={[styles.actionText, { color: config.color }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={hideToast}
          style={styles.dismissButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (c: typeof Colors) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  dismissIcon: {
    fontSize: 20,
    color: c.textMuted,
    fontWeight: '300',
  },
});

// Toast context for app-wide usage
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: { label: string; onPress: () => void }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string, action?: { label: string; onPress: () => void }) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    action?: { label: string; onPress: () => void };
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    action?: { label: string; onPress: () => void }
  ) => {
    setToastState({ visible: true, message, type, action });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'error', action);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const handleDismiss = useCallback(() => {
    setToastState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        action={toastState.action}
        onDismiss={handleDismiss}
      />
    </ToastContext.Provider>
  );
};

export default Toast;
