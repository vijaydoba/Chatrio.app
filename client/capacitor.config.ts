import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.chatrio.circles',
  appName: 'Circles',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    hostname: 'chatrio.app'
  }
};

export default config;
