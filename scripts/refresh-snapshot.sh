#!/usr/bin/env bash
# Odswieza data/snapshot.json danymi z Velory.
#
# Dane pobiera curl, a nie Python — Python na tej maszynie nie ma certyfikatow
# glownych i kazde zapytanie HTTPS konczy sie CERTIFICATE_VERIFY_FAILED.
# Python sluzy tu tylko do przetworzenia pobranych plikow.
set -euo pipefail
cd "$(dirname "$0")/.."

API="https://api.velora.pet/v1/breeders"
RAW="$(mktemp -d)"
trap 'rm -rf "$RAW"' EXIT

for s in paramitapl paramita-fci; do
  curl -fsS --max-time 30 -o "$RAW/$s-profile.json" "$API/$s"
  curl -fsS --max-time 30 -o "$RAW/$s-animals.json" "$API/$s/animals?limit=50"
  curl -fsS --max-time 30 -o "$RAW/$s-events.json"  "$API/$s/events?when=upcoming&limit=50"
  curl -fsS --max-time 30 -o "$RAW/$s-gallery.json" "$API/$s/gallery?photosPerAlbum=50"
done

RAW_DIR="$RAW" python3 - <<'PY'
import json, os, re, datetime
RAW = os.environ["RAW_DIR"]
CDN = "https://images.velora.pet"
SLUGS = {"paramitapl": "CAT", "paramita-fci": "DOG"}

def load(s, kind):
    return json.load(open(f"{RAW}/{s}-{kind}.json", encoding="utf-8"))

def img(url, variant):
    """API oddaje /uploads/{hash} BEZ rozszerzenia, a ten adres zwraca 404.
    Dzialajacy adres to {CDN}/{hash}-{variant}.webp. Ta sama regula co w js/img.js."""
    if not url or "/uploads/" not in url:
        return url or None
    path = url.split("/uploads/", 1)[1]
    if re.search(r"\.\w{2,5}$", path):
        return f"{CDN}/{path}"
    return f"{CDN}/{path}-{variant}.webp"

out = {"animals": [], "events": [], "albums": [], "profiles": {}}
for slug, species in SLUGS.items():
    p = load(slug, "profile")
    out["profiles"][slug] = {
        "name": p["name"], "species": species, "foundedYear": p.get("foundedYear"),
        "city": p.get("city"), "country": p.get("country"), "region": p.get("region"),
        "email": p.get("contactEmail") or None, "phone": p.get("contactPhone") or None,
        "breeds": [b["name"] for b in p.get("breeds", [])],
        "club": (p.get("club") or {}).get("name"),
        "logo": img(p.get("logo"), "md"),
    }
    for a in load(slug, "animals")["data"]:
        c = a.get("colorRef") or {}
        out["animals"].append({
            "breeder": slug, "species": species, "name": a["name"], "animalSlug": a["slug"],
            "breed": (a.get("breedRef") or {}).get("name"),
            "colorPl": c.get("namePl"), "colorEn": c.get("nameEn"), "ems": c.get("emsCode"),
            "sex": a.get("sex"), "birthDate": a.get("birthDate"), "titles": a.get("titles") or [],
            "photo": img(a.get("photoUrl"), "md"), "photoLg": img(a.get("photoUrl"), "lg"),
        })
    for e in load(slug, "events")["data"]:
        out["events"].append({
            "breeder": slug, "title": e["title"], "eventSlug": e.get("slug"),
            "startDate": e.get("startDate"), "endDate": e.get("endDate"),
            "city": e.get("city"), "country": e.get("country"),
        })
    for al in load(slug, "gallery")["data"]:
        out["albums"].append({
            "breeder": slug, "name": al["name"], "description": al.get("description"),
            "photoCount": al.get("photoCount"),
            "photos": [{"thumb": img(q["fileUrl"], "thumb"), "lg": img(q["fileUrl"], "lg"),
                        "w": q.get("width"), "h": q.get("height"), "title": q.get("title")}
                       for q in al.get("photos", [])],
        })

out["capturedAt"] = datetime.date.today().isoformat()
json.dump(out, open("data/snapshot.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"zapis {out['capturedAt']}: zwierzat={len(out['animals'])} "
      f"wystaw={len(out['events'])} albumow={len(out['albums'])}")
missing = [a["name"] for a in out["animals"] if not a["photo"]]
if missing:
    print("bez zdjecia w portalu:", ", ".join(missing))
PY

echo
echo "Sprawdzam, czy adresy zdjec z zapisu naprawde dzialaja..."
python3 -c "
import json
d = json.load(open('data/snapshot.json'))
u = [a[k] for a in d['animals'] for k in ('photo','photoLg') if a[k]]
u += [p[k] for al in d['albums'] for p in al['photos'] for k in ('thumb','lg') if p[k]]
u += [p['logo'] for p in d['profiles'].values() if p['logo']]
print('\n'.join(dict.fromkeys(u)))" > "$RAW/urls.txt"

ok=0; bad=0
while read -r u; do
  if [ "$(curl -s -o /dev/null --max-time 15 -w '%{http_code}' "$u")" = "200" ]; then
    ok=$((ok + 1))
  else
    bad=$((bad + 1)); echo "  NIE DZIALA: $u"
  fi
done < "$RAW/urls.txt"
echo "  dzialajacych: $ok, niedzialajacych: $bad"

# Proba kontrolna: bez sufiksu wariantu ten sam plik MUSI dac 404. Bez tego
# sprawdzenie wyzej niczego nie dowodzi — moglby przepuscic kazdy adres.
ctl="$(head -1 "$RAW/urls.txt" | sed -E 's/-(md|lg|thumb|original)\.webp$//')"
ctl_code="$(curl -s -o /dev/null --max-time 15 -w '%{http_code}' "$ctl")"
if [ "$ctl_code" = "404" ]; then
  echo "  proba kontrolna OK (bez wariantu = 404, czyli sprawdzenie ma sens)"
else
  echo "  UWAGA: proba kontrolna zwrocila $ctl_code, oczekiwano 404 —"
  echo "  regula nazw plikow w Velorze mogla sie zmienic, sprawdz js/img.js"
fi

[ "$bad" -eq 0 ] || exit 1
