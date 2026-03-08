// ============================================================================
// JEST GLOBAL SETUP
// Mocks for native modules and global test configuration
// ============================================================================

// Define React Native globals
global.__DEV__ = true;

// Silence console warnings in tests unless we explicitly want them
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Filter out noisy React Native warnings in tests
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated:') ||
        args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
        args[0].includes('ReactNativeFiberHostComponent'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// ============================================================================
// MOCK: @react-native-async-storage/async-storage
// ============================================================================

const mockAsyncStorage = (() => {
  let store = {};

  const impl = {
    setItem: (key, value) => {
      store[key] = value;
      return Promise.resolve();
    },
    getItem: (key) => {
      return Promise.resolve(store[key] !== undefined ? store[key] : null);
    },
    removeItem: (key) => {
      delete store[key];
      return Promise.resolve();
    },
    clear: () => {
      store = {};
      return Promise.resolve();
    },
    getAllKeys: () => {
      return Promise.resolve(Object.keys(store));
    },
    multiGet: (keys) => {
      return Promise.resolve(keys.map((key) => [key, store[key] !== undefined ? store[key] : null]));
    },
    multiSet: (keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        store[key] = value;
      });
      return Promise.resolve();
    },
    multiRemove: (keys) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    },
  };

  return {
    setItem: jest.fn(impl.setItem),
    getItem: jest.fn(impl.getItem),
    removeItem: jest.fn(impl.removeItem),
    clear: jest.fn(impl.clear),
    getAllKeys: jest.fn(impl.getAllKeys),
    multiGet: jest.fn(impl.multiGet),
    multiSet: jest.fn(impl.multiSet),
    multiRemove: jest.fn(impl.multiRemove),
    // Helper for tests to inspect/reset store
    __getStore: () => store,
    __setStore: (newStore) => {
      store = newStore;
    },
    __resetStore: () => {
      store = {};
    },
    // Restore the original implementations
    __restoreImplementations: () => {
      mockAsyncStorage.setItem.mockImplementation(impl.setItem);
      mockAsyncStorage.getItem.mockImplementation(impl.getItem);
      mockAsyncStorage.removeItem.mockImplementation(impl.removeItem);
      mockAsyncStorage.clear.mockImplementation(impl.clear);
      mockAsyncStorage.getAllKeys.mockImplementation(impl.getAllKeys);
      mockAsyncStorage.multiGet.mockImplementation(impl.multiGet);
      mockAsyncStorage.multiSet.mockImplementation(impl.multiSet);
      mockAsyncStorage.multiRemove.mockImplementation(impl.multiRemove);
    },
  };
})();

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// ============================================================================
// MOCK: expo-secure-store
// ============================================================================

const mockSecureStore = (() => {
  let store = {};

  return {
    getItemAsync: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    setItemAsync: jest.fn((key, value, options) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    // Helper for tests
    __getStore: () => store,
    __setStore: (newStore) => {
      store = newStore;
    },
    __resetStore: () => {
      store = {};
    },
  };
})();

jest.mock('expo-secure-store', () => mockSecureStore);

// ============================================================================
// MOCK: expo-constants
// ============================================================================

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        sentryDsn: 'YOUR_DSN_HERE',
      },
    },
  },
}));

// ============================================================================
// MOCK: expo-crypto
// ============================================================================

let cryptoCallCount = 0;
const mockCrypto = {
  getRandomBytesAsync: jest.fn(async (length) => {
    // Generate different bytes for each call (for uniqueness tests)
    cryptoCallCount++;
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push((i * 17 + 123 + cryptoCallCount * 7) % 256);
    }
    // Return as Uint8Array which is iterable
    return new Uint8Array(bytes);
  }),
  digestStringAsync: jest.fn((algorithm, data) => {
    // Generate a deterministic hash for testing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    // Return a hex string that looks like a hash
    const hashHex = Math.abs(hash).toString(16).padStart(64, '0');
    return Promise.resolve(hashHex);
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
    MD5: 'MD5',
  },
};

jest.mock('expo-crypto', () => mockCrypto);

// ============================================================================
// MOCK: expo-file-system
// ============================================================================

const mockFileSystem = (() => {
  let files = {};

  return {
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    EncodingType: {
      UTF8: 'utf8',
      Base64: 'base64',
    },
    writeAsStringAsync: jest.fn((fileUri, contents, options) => {
      files[fileUri] = contents;
      return Promise.resolve();
    }),
    readAsStringAsync: jest.fn((fileUri, options) => {
      if (files[fileUri]) {
        return Promise.resolve(files[fileUri]);
      }
      return Promise.reject(new Error('File not found'));
    }),
    readDirectoryAsync: jest.fn((dirPath) => {
      // Return all files that start with the directory path
      const dirFiles = Object.keys(files)
        .filter(path => path.startsWith(dirPath))
        .map(path => path.replace(dirPath, '').split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i); // unique
      return Promise.resolve(dirFiles);
    }),
    deleteAsync: jest.fn((fileUri, options) => {
      delete files[fileUri];
      return Promise.resolve();
    }),
    getInfoAsync: jest.fn((fileUri, options) => {
      const exists = fileUri in files;
      // Check if it's a directory by seeing if any file starts with this path
      const isDir = Object.keys(files).some(path => path.startsWith(fileUri + '/'));
      return Promise.resolve({
        exists: exists || isDir,
        isDirectory: isDir && !exists,
        size: exists ? files[fileUri].length : 0,
        modificationTime: Date.now(),
      });
    }),
    makeDirectoryAsync: jest.fn(() => Promise.resolve()),
    copyAsync: jest.fn(({ from, to }) => {
      files[to] = files[from];
      return Promise.resolve();
    }),
    // Helper for tests
    __getFiles: () => files,
    __setFiles: (newFiles) => {
      files = newFiles;
    },
    __resetFiles: () => {
      files = {};
    },
  };
})();

jest.mock('expo-file-system', () => mockFileSystem);

// ============================================================================
// MOCK: expo-notifications
// ============================================================================

const mockNotifications = {
  scheduleNotificationAsync: jest.fn(() =>
    Promise.resolve('mock-notification-id')
  ),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', canAskAgain: true })
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', canAskAgain: true })
  ),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    LOW: 2,
    MAX: 5,
    MIN: 1,
    UNSPECIFIED: 0,
  },
  SchedulableTriggerInputTypes: {
    CALENDAR: 'calendar',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },
  AndroidNotificationPriority: {
    DEFAULT: 'default',
    HIGH: 'high',
    LOW: 'low',
    MAX: 'max',
    MIN: 'min',
  },
};

jest.mock('expo-notifications', () => mockNotifications);

// ============================================================================
// MOCK: @sentry/react-native
// ============================================================================

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
  withScope: jest.fn((callback) => callback({
    setLevel: jest.fn(),
    setExtras: jest.fn(),
  })),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  startTransaction: jest.fn(() => ({
    startChild: jest.fn(() => ({
      setStatus: jest.fn(),
      finish: jest.fn(),
    })),
    finish: jest.fn(),
  })),
}));

// ============================================================================
// MOCK: expo-updates
// ============================================================================

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// MOCK: react-native-reanimated
// ============================================================================

jest.mock('react-native-reanimated', () => ({
  default: {
    call: jest.fn(),
    createAnimatedComponent: (component) => component,
    Value: jest.fn(),
    event: jest.fn(),
    add: jest.fn(),
    eq: jest.fn(),
    set: jest.fn(),
    cond: jest.fn(),
    interpolate: jest.fn(),
    View: 'Animated.View',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
  },
  useSharedValue: jest.fn((init) => ({ value: init })),
  useAnimatedStyle: jest.fn(() => ({})),
  useAnimatedScrollHandler: jest.fn(() => jest.fn()),
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withDelay: jest.fn((_, value) => value),
  withSequence: jest.fn((...args) => args[args.length - 1]),
  withRepeat: jest.fn((value) => value),
  FadeIn: { delay: jest.fn().mockReturnValue({ duration: jest.fn().mockReturnValue({}) }) },
  FadeInDown: { delay: jest.fn().mockReturnValue({ duration: jest.fn().mockReturnValue({}) }) },
  FadeInUp: { delay: jest.fn().mockReturnValue({ duration: jest.fn().mockReturnValue({}) }) },
  FadeOut: { duration: jest.fn().mockReturnValue({}) },
  SlideInRight: { duration: jest.fn().mockReturnValue({}) },
  SlideOutLeft: { duration: jest.fn().mockReturnValue({}) },
  Layout: { duration: jest.fn().mockReturnValue({}) },
  Easing: { bezier: jest.fn() },
  runOnJS: jest.fn((fn) => fn),
  createAnimatedComponent: jest.fn((component) => component),
}));

// ============================================================================
// MOCK: @react-navigation/native
// ============================================================================

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb) => cb()),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  useRoute: jest.fn(() => ({ params: {} })),
  useIsFocused: jest.fn(() => true),
  NavigationContainer: ({ children }) => children,
}));

// ============================================================================
// MOCK: @expo/vector-icons
// ============================================================================

const MockIcon = 'Icon';
jest.mock('@expo/vector-icons', () => ({
  Ionicons: MockIcon,
  MaterialIcons: MockIcon,
  MaterialCommunityIcons: MockIcon,
  FontAwesome: MockIcon,
  FontAwesome5: MockIcon,
  Feather: MockIcon,
  AntDesign: MockIcon,
  Entypo: MockIcon,
  EvilIcons: MockIcon,
  Foundation: MockIcon,
  Octicons: MockIcon,
  SimpleLineIcons: MockIcon,
  Zocial: MockIcon,
  createIconSet: jest.fn(() => MockIcon),
}));

jest.mock('@expo/vector-icons/build/AntDesign', () => 'Icon');
jest.mock('@expo/vector-icons/build/Ionicons', () => 'Icon');
jest.mock('@expo/vector-icons/build/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons/build/MaterialCommunityIcons', () => 'Icon');
jest.mock('@expo/vector-icons/build/FontAwesome', () => 'Icon');
jest.mock('@expo/vector-icons/build/Feather', () => 'Icon');

// ============================================================================
// MOCK: expo-linear-gradient
// ============================================================================

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// ============================================================================
// MOCK: expo-linking
// ============================================================================

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://localhost:8081/${path}`),
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn((url) => ({ path: url, queryParams: {} })),
}));

// ============================================================================
// MOCK: expo-localization
// ============================================================================

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', regionCode: 'US' }]),
  getCalendars: jest.fn(() => [{ calendar: 'gregory', timeZone: 'America/New_York' }]),
  locale: 'en-US',
  locales: ['en-US'],
  timezone: 'America/New_York',
  isRTL: false,
}));

// ============================================================================
// MOCK: expo-store-review
// ============================================================================

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  requestReview: jest.fn(() => Promise.resolve()),
  hasAction: jest.fn(() => Promise.resolve(false)),
}));

// ============================================================================
// MOCK: expo-sharing
// ============================================================================

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// MOCK: expo-document-picker
// ============================================================================

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: true,
      assets: null,
    })
  ),
}));

// ============================================================================
// MOCK: react-native
// ============================================================================

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Alert: {
    alert: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: jest.fn((style) => style),
  },
}));

// ============================================================================
// Global test helpers
// ============================================================================

global.resetAllMockStores = () => {
  mockAsyncStorage.__resetStore();
  mockAsyncStorage.__restoreImplementations();
  mockSecureStore.__resetStore();
  mockFileSystem.__resetFiles();
};

// Reset stores before each test
beforeEach(() => {
  global.resetAllMockStores();
});

// ============================================================================
// Date mocking utilities
// ============================================================================

global.mockDate = (dateString) => {
  const mockDate = new Date(dateString);
  jest.useFakeTimers().setSystemTime(mockDate);
  return mockDate;
};

global.restoreDate = () => {
  jest.useRealTimers();
};
