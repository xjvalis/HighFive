import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.highfive.app',
  appName: 'HighFive',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      backgroundColor: '#00000000'
    }
  },
  android: {
    captureInput: true
  }
};

export default config;