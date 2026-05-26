import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

function isPhoneValid(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.length < 5) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10;
}

function validateForm(fd: FormData, phone: string, consent: boolean) {
  const fullName = String(fd.get("fullName") ?? "").trim();
  const login = String(fd.get("login") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  const phoneError = !isPhoneValid(phone) ? "Введите номер телефона." : null;
  const consentError = !consent ? "Необходимо согласие на обработку персональных данных." : null;
  let formError: string | null = null;

  if (fullName.length < 2) formError = "Укажите ФИО (не менее 2 символов).";
  else if (!login) formError = "Введите логин.";
  else if (!password) formError = "Введите пароль.";
  else if (password.length < 3) formError = "Пароль должен быть не короче 3 символов.";

  const hasErrors = !!(phoneError || consentError || formError);
  return { phoneError, consentError, formError, hasErrors };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitAttempted(true);

    const fd = new FormData(e.currentTarget);
    const validation = validateForm(fd, phone, consent);
    setPhoneError(validation.phoneError);
    setConsentError(validation.consentError);
    setError(validation.formError);

    if (validation.hasErrors) return;

    const login = String(fd.get("login")).trim();
    const password = String(fd.get("password") ?? "");

    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        login,
        password,
        fullName: fd.get("fullName"),
        phone: phone.trim(),
        gender: fd.get("gender"),
        role: "client",
        consent: true,
      });
      setSession(res.data.accessToken, res.data.user);
      toast("Аккаунт создан", `Добро пожаловать, ${res.data.user.fullName}`);
      navigate("/client", { replace: true });
    } catch (err: any) {
      if (err.response?.data?.error === "login_already_taken") {
        setError("Логин уже занят, выберите другой");
      } else if (err.response?.data?.error === "validation_error") {
        setPhoneError("Введите корректный номер телефона.");
        setConsentError("Подтвердите согласие на обработку персональных данных.");
        setError(null);
      } else {
        setError("Не удалось создать аккаунт. Проверьте поля.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center page-shell">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-cream-200 shadow-soft p-10">
        <div className="font-display text-3xl tracking-widest text-center text-ink-700">ATELIER</div>
        <h1 className="font-display text-2xl text-center mt-4">Создание аккаунта</h1>

        <form className="mt-6 grid grid-cols-2 gap-4" onSubmit={onSubmit} noValidate>
          {submitAttempted && error && (
            <div className="col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="col-span-2"><Input label="ФИО" name="fullName" required /></div>
          <Input label="Логин" name="login" required autoComplete="username" />
          <div>
            <Input
              label="Телефон"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+7 (999) 000-00-00"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              aria-invalid={!!phoneError}
              className={phoneError ? "border-red-300 focus:ring-red-200" : undefined}
            />
            {submitAttempted && phoneError && (
              <p className="text-xs text-red-600 mt-1">{phoneError}</p>
            )}
          </div>
          <Input label="Пароль" name="password" type="password" required minLength={3} autoComplete="new-password" />
          <div>
            <label className="field-label">Пол</label>
            <select name="gender" className="field-input bg-transparent">
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="flex items-start gap-2 text-xs text-ink-400 mt-2 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (consentError) setConsentError(null);
                }}
                className="mt-0.5"
              />
              <span>Согласен с правилами обработки персональных данных и публичной офертой ATELIER.</span>
            </label>
            {submitAttempted && consentError && (
              <p className="text-xs text-red-600 mt-1">{consentError}</p>
            )}
          </div>
          <Button full className="col-span-2 mt-2" disabled={loading}>
            {loading ? "Создание…" : "Создать аккаунт"}
          </Button>
        </form>

        <div className="text-center text-sm text-ink-400 mt-5">
          Уже есть аккаунт? <Link to="/login" className="text-ink-700 underline-offset-2 hover:underline">Войти</Link>
        </div>
      </div>
    </div>
  );
}
