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

### Zachowanie danych z Lovable Cloud

Lovable Cloud nie udostępnia prostego przeniesienia projektu na konto Supabase.
Oficjalna ścieżka polega na osobnym przeniesieniu schematu i danych:

1. W Lovable otwórz Cloud → Database.
2. Wyeksportuj potrzebne tabele do CSV, w szczególności `profiles` i
   `meter_readings`.
3. Zastosuj migracje w nowym Supabase:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

4. Załóż konta użytkowników w nowym Supabase. Lovable pozwala wyeksportować dane
   użytkowników, ale nie ich hasła, więc użytkownicy muszą ustawić nowe hasła.
5. W wyeksportowanych odczytach zastąp stare `user_id` identyfikatorami nowych
   kont z Authentication → Users.
6. Zaimportuj odczyty w Supabase przez Table Editor → `meter_readings` →
   Insert → Import data from CSV.
7. Ustaw stawkę za kWh i język w aplikacji lub zaktualizuj istniejące rekordy
   `profiles`. Nie importuj profili bezpośrednio na rekordy utworzone już przez
   rejestrację, bo ich klucze główne będą się powtarzać.

Przy jednym użytkowniku najłatwiej założyć jedno nowe konto, skopiować jego UUID
do kolumny `user_id` w CSV i dopiero wtedy wykonać import. Przy większej liczbie
użytkowników warto przygotować osobny skrypt mapujący stare konta na nowe.

Przed importem sprawdź też, czy nie ma dwóch odczytów tego samego użytkownika z
tą samą datą. Nowy schemat celowo blokuje takie duplikaty.

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
