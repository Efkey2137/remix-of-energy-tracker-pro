# Przeniesienie bazy z Lovable Cloud

## 1. Utwórz docelowy projekt

Utwórz projekt Supabase we własnej organizacji i zapisz:

- Project URL,
- Publishable key,
- Secret/service role key,
- hasło do bazy danych.

Nie zapisuj secret/service role key w repozytorium ani w zmiennej z prefiksem
`VITE_`.

## 2. Wybierz sposób migracji

### Nowa, pusta baza

Jeżeli stare odczyty nie są potrzebne, zastosuj migracje z repozytorium:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### Zachowanie kont i wszystkich danych

Najbezpieczniejsza ścieżka to pełny backup PostgreSQL starego projektu i jego
odtworzenie w nowym projekcie. Dzięki temu zachowane zostają także rekordy
Supabase Auth, a użytkownicy nie muszą zakładać kont ponownie.

1. Wznów stary projekt w Lovable Cloud.
2. Pobierz backup bazy z panelu projektu.
3. Odtwórz backup do nowego Supabase zgodnie z instrukcją „Restore to a new
   project” w panelu Supabase.
4. Po odtworzeniu sprawdź historię migracji:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
```

Jeżeli tabele już istnieją, ale dwie początkowe migracje nie są oznaczone jako
zastosowane, wyrównaj historię bez ponownego tworzenia tabel, a następnie wgraj
nową migrację:

```bash
npx supabase migration repair --status applied 20260604085437
npx supabase migration repair --status applied 20260604085449
npx supabase db push
```

Przed importem sprawdź, czy w starej bazie nie ma dwóch odczytów tego samego
użytkownika z tą samą datą. Nowy schemat celowo blokuje takie duplikaty.

## 3. Przełącz aplikację

W Vercel ustaw wartości z `.env.example` na dane nowego projektu. Zmień wszystkie
zmienne w jednej operacji i dopiero wtedy wykonaj nowe wdrożenie, aby frontend i
endpoint kontrolny nigdy nie wskazywały dwóch różnych baz.

Po wdrożeniu sprawdź:

1. rejestrację i logowanie,
2. dodanie dwóch odczytów,
3. wyliczenia na pulpicie,
4. zmianę ceny za kWh,
5. usunięcie testowego odczytu,
6. odpowiedź endpointu `/api/public/keep-alive` wywołanego przez Vercel Cron.

## 4. Wyłącz stary backend

Stary projekt usuń dopiero po potwierdzeniu, że konta i odczyty są dostępne w
nowej bazie oraz po zachowaniu osobnego backupu. Usunięcie starej bazy nie jest
częścią automatycznego wdrożenia tej aplikacji.
