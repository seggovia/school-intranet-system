import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`API Sistema de Intranet Escolar escuchando en http://localhost:${env.PORT}`);
});
