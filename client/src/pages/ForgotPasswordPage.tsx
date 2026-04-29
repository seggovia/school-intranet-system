import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, School } from 'lucide-react';
import { requestPasswordReset } from '../api';
import { normalizeApiError } from '../api-error';

type FieldErrors = { email?: string };

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const initialEmail = useMemo(() => params.get('email') ?? '', [params]);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = 'El correo es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Ingresa un correo válido.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setDevUrl('');
    if (!validate()) return;
    try {
      setLoading(true);
      const result = await requestPasswordReset(email.trim());
      setNotice(result.message);
      if (result.resetUrl) setDevUrl(result.resetUrl);
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
        <h1>Restablece tu acceso</h1>
        <p>Te enviaremos un enlace temporal para crear una nueva contraseña de forma segura.</p>
      </section>
      <section className="login-panel">
        <div className="login-heading">
          <Mail size={22} />
          <div>
            <h2>Recuperar contraseña</h2>
            <p>Ingresa tu correo institucional.</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            Correo
            <input value={email} onChange={(event) => { setEmail(event.target.value); setErrors({}); setNotice(''); }} type="email" autoComplete="email" placeholder="correo@colegio.cl" className={errors.email ? 'input-error' : undefined} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          {notice && <p className="form-success">{notice}</p>}
          {devUrl && <p className="dev-reset-link"><strong>Link de prueba:</strong> <a href={devUrl}>{devUrl}</a></p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Solicitar restablecimiento'}</button>
          <Link className="login-help-link" to="/login">Volver al login</Link>
        </form>
      </section>
    </main>
  );
}
