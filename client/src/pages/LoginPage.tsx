import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, School } from 'lucide-react';
import { login } from '../api';
import type { AuthSession } from '../types';

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const nextErrors: typeof fieldErrors = {};
    const emailValue = email.trim();
    if (!emailValue) nextErrors.email = 'Correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) nextErrors.email = 'Formato de correo inválido';
    if (!password) nextErrors.password = 'Contraseña requerida';
    else if (password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const session = await login(email.trim(), password);
      onLogin(session);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? 'No se pudo iniciar sesión con esas credenciales.');
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
        <h1>Sistema de Intranet Colegio</h1>
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
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: undefined }));
                setError('');
              }}
              type="email"
              autoComplete="email"
              placeholder="correo@colegio.cl"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>
          <label className="password-field">
            Contraseña
            <span>
              <input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                  setError('');
                }}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
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
