const Store = require('electron-store');

// Create encrypted store for sensitive data
const secureStore = new Store({
  name: 'heritage-secure',
  encryptionKey: 'heritage-genealogy-app-v1', // In production, use a more secure key derivation
  schema: {
    credentials: {
      type: 'object',
      default: {},
      properties: {
        genealogieQuebec: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          }
        },
        familySearch: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' }
          }
        }
      }
    }
  }
});

module.exports = {
  // Site credentials
  getCredentials: (site) => {
    const creds = secureStore.get('credentials', {});
    return creds[site] || null;
  },
  setCredentials: (site, credentials) => {
    const current = secureStore.get('credentials', {});
    current[site] = credentials;
    secureStore.set('credentials', current);
  },
  getAllCredentials: () => secureStore.get('credentials', {}),

  hasCredentials: (site) => {
    const creds = secureStore.get('credentials', {});
    return !!(creds[site]?.username && creds[site]?.password);
  }
};
