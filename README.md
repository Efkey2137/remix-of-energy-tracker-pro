# Energy Tracker

Mobilny tracker odczytów licznika energii z logowaniem, historią, wykresem zużycia
i szacowaniem kosztów. Aplikacja działa na TanStack Start i Vercel, a dane oraz
logowanie obsługuje niezależny projekt Supabase należący do właściciela aplikacji.

Projekt nie wymaga Lovable Cloud. Nie zawiera identyfikatora starej bazy ani
zależności buildowych Lovable.

## Uruchomienie lokalne

1. Skopiuj `.env.example` do `.env.local`.
2. Wstaw URL i klucze własnego projektu Supabase.
3. Zainstaluj zależności i uruchom aplikację:

```bash
npm install
npm run dev
```

## Przygotowanie własnej bazy

Migracje znajdują się w `supabase/migrations`. Po utworzeniu projektu Supabase:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migracje tworzą:

- konta i profile użytkowników połączone z Supabase Auth,
- odczyty licznika chronione przez RLS,
- unikalny odczyt na dzień,
- walidację kolejności i wartości licznika po stronie bazy,
- automatyczną aktualizację profilu i Realtime.

Pełna instrukcja przeniesienia istniejących danych znajduje się w
[`docs/database-migration.md`](docs/database-migration.md).

## Konfiguracja Vercela

Dodaj zmienne ze `.env.example` w ustawieniach projektu Vercel dla Production
oraz Preview. Klucz `SUPABASE_SERVICE_ROLE_KEY` jest wyłącznie serwerowy i nigdy
nie może mieć prefiksu `VITE_`.

W Supabase ustaw:

- Authentication → URL Configuration → Site URL:
  `https://home-power-log.vercel.app`,
- Redirect URLs: domenę produkcyjną i domeny podglądów Vercela,
- własny SMTP, jeśli rejestracja ma wysyłać wiadomości do użytkowników produkcyjnych.

Vercel uruchamia codzienny, zabezpieczony endpoint kontrolny. Pomaga to utrzymać
aktywność darmowego projektu. Jedynym wariantem gwarantującym brak automatycznego
pauzowania przez Supabase jest plan płatny.

## Kontrola jakości

```bash
npm run typecheck
npm run lint
npm run build
```
