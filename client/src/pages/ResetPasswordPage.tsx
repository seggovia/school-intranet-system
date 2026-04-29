import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LockKeyhole, School } from 'lucide-react';
import { resetPassword } from '../api';
import { normalizeApiError } from '../api-error';

type FieldErrors = { token?: string; password?: string; confirmPassword?: string };

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!token) nextErrors.token = 'El enlace de restablecimiento no es válido.';
    if (!password) nextErrors.password = 'La nueva contraseña es obligatoria.';
    else if (password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Repite la contraseña.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await resetPassword({ token, password });
      setNotice(result.message);
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      const apiError = normalizeApiError(err);
      setNotice(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-visual">
        <div className="school-crest"><School size={42} /></div>
        <h1>Nueva contraseña</h1>
        <p>Crea una contraseña segura para recuperar tu acceso institucional.</p>
      </section>
      <section className="login-panel">
        <div className="login-heading">
          <LockKeyhole size={22} />
          <div>
            <h2>Restablecer contraseña</h2>
            <p>El enlace expira 30 minutos después de solicitado.</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          {errors.token && <p className="form-error">{errors.token}</p>}
          <label>
            Nueva contraseña
            <input value={password} onChange={(event) => { setPassword(event.target.value); setErrors({}); setNotice(''); }} type="password" autoComplete="new-password" className={errors.password ? 'input-error' : undefined} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <label>
            Repetir contraseña
            <input value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setErrors({}); setNotice(''); }} type="password" autoComplete="new-password" className={errors.confirmPassword ? 'input-error' : undefined} />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </label>
          {notice && <p className={notice.includes('correctamente') ? 'form-success' : 'form-error'}>{notice}</p>}
          <button className="primary-button" type="submit" disabled={loading || !token}>{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</button>
          <Link className="login-help-link" to="/login">Volver al login</Link>
        </form>
      </section>
    </main>
  );
}
