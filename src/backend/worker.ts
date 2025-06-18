import { app } from './server';
import { staticPlugin } from '@elysiajs/static';

const finalApp = app.use(
  staticPlugin({
    assets: 'dist',
    prefix: '',
    indexHTML: true,
  })
);

export default {
  fetch: finalApp.fetch,
}; 