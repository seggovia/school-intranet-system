import { FormEvent, useState } from 'react';
import { LockKeyhole, School } from 'lucide-react';
import { login } from '../api';
import type { AuthSession } from '../types';

const demoAccounts = [
  'director@school-intranet.test',
  'teacher@school-intranet.test',
  'guardian@school-intranet.test',
  'student@school-intranet.test',
  'admin@school-intranet.test',
  'inspector@school-intranet.test'
];

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState(demoAccounts[0]);
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await login(email, password);
      onLogin(session);
    } catch {
      setError('No se pudo iniciar sesion con esas credenciales.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-visual">
        <div className="school-crest">
          <School size={42} />
        </div>
        <h1>Sistema de Intranet Escolar</h1>
        <p>Gestion academica, comunicacion familiar, operacion escolar y flujos administrativos en una plataforma interna.</p>
        <div className="login-metrics">
          <span><strong>1.172</strong> estudiantes</span>
          <span><strong>86</strong> docentes</span>
          <span><strong>24/7</strong> autoservicio</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-heading">
          <LockKeyhole size={22} />
          <div>
            <h2>Acceso institucional</h2>
            <p>Clave demo: demo1234</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Correo
            <select value={email} onChange={(event) => setEmail(event.target.value)}>
              {demoAccounts.map((account) => (
                <option key={account}>{account}</option>
              ))}
            </select>
          </label>
          <label>
            Clave
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}
