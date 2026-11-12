const store = {};
export const getCache = (key) => store[key];
export const setCache = (key, value) => { store[key] = value; };
export const clearCache = () => { Object.keys(store).forEach(k => delete store[k]); };
