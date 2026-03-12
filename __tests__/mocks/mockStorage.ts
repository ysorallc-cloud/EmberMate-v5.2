// In-memory storage mock that bypasses encryption
const store: Record<string, string> = {};

export const safeGetItem = async (key: string, defaultVal?: any) => {
  const val = store[key];
  return val ? JSON.parse(val) : defaultVal;
};

export const safeSetItem = async (key: string, value: any) => {
  store[key] = JSON.stringify(value);
  return true;
};

export const safeRemoveItem = async (key: string) => {
  delete store[key];
  return true;
};

export const safeGetItemWithValidation = async (key: string, _requiredKeys: string[], defaultVal?: any) => {
  const val = store[key];
  return val ? JSON.parse(val) : defaultVal;
};

export const encryptedGetRaw = async (key: string): Promise<string | null> => {
  return store[key] ?? null;
};

export const encryptedSetRaw = async (key: string, value: string): Promise<void> => {
  store[key] = value;
};

export const clearMockStore = () => {
  Object.keys(store).forEach(k => delete store[k]);
};
