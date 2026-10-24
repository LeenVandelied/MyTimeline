[MAJEUR] frontend/src/components/products/ProductsListView.tsx:397 - `w-full max-w-0` à toutes largeurs : à 768–1023 le nom (toute longueur, même court) tombe à ~27 px (mesuré par #816 lui-même), spec n'y couvre rien ; corriger la densité md..lg (frise 64 px jusqu'à `lg`, ou masquer compteur) AVANT merge, ou ouvrir l'issue de suivi avec label bloquant — le follow-up "triage S" est insuffisant car le défaut est le même que #825 (nom illisible).
[MINEUR] frontend/src/components/products/ProductsListView.tsx:433 - titre prochain événement plafonné à 80 px de 640 à 1279 : troncature agressive, aucun `title` pour souris ; nom accessible OK (texte complet dans le DOM, `truncate` = visuel seul) ; ajouter `title={next.title}` (idem nom produit l.405).
[MINEUR] frontend/src/components/ui/tabs.tsx:66 - `select()` puis `.focus()` inconditionnel : si parent contrôlé refuse le changement, focus sur onglet `tabIndex=-1` non sélectionné ; cas théorique (aucun consommateur ne refuse), documenter ou garder.
[MINEUR] frontend/e2e/sprint-114-products-list-overflow.spec.ts:149,169,192 - `console.log` de debug laissés (3) ; retirer ou passer par `testInfo.attach`.
[MINEUR] frontend/e2e/sprint-114-products-list-overflow.spec.ts:185 - armement (l.183-190) ne rétablit pas `xl:max-w-64`/`sm:max-w-64` : régression du plafond titre non prouvée rouge par l'auto-contrôle (couverte seulement indirectement par le titre long à 1024) ; ajouter `max-width:16rem` sur le `div` du titre dans l'armement.
[MINEUR] frontend/src/components/products/ProductsListView.test.tsx:332 - `scroller!` non-null assertion ; garder `expect(scroller).not.toBeNull()` + garde, cohérent avec ProductList.test (`if (!count) return`).
[OK] #825 layout <sm : secondaire `hidden`, nom sans plafond (`sm:` seulement), compteur `ms-auto shrink-0` en bout ; pas de régression mobile.
[OK] #825 ProductList.tsx : nom base auto + `sm:max-w-[60%]`, secondaire `flex-1 min-w-0 truncate text-end` ; testids neufs cités par la spec ; repli `noUpcoming` i18n via `t()`.
[OK] #825 spec dashboard : non vacue (oracle largeur nom ≥40 % + cas i=0 strict ; base 0 d'origine donnait ~0–8 px), mesure ellipsis/ordre/confinement, semis purgé par `seedIsolation` (auto), `storageState` PROD, aucun sleep, indépendante de l'ordre.
[OK] #815 tabs.tsx : refs par index réassignées à chaque render (callback ref), `null` au démontage, clé `item.value` ; focus dans le handler clavier (pas d'effet) ⇒ ni vol de focus au clic ni sur changement parent ; `tabIndex` itinérant, `role=tab`, `aria-selected` inchangés ; refs scopées par instance (2 tablists testées).
[OK] #815 tabs.test.tsx : contrôlé + non contrôlé, bouclage, Home/End, touche ignorée, appels `onValueChange` exacts, clic ; échoue sans `.focus()`. Spec E2E : armement clavier (PIT-S83-014), `:focus-visible` mesuré, 2 consommateurs × 2 viewports, `storageState` présent.
[OK] #816 relative + sr-only : `offsetParent === boîte` asserté, anti-vacuité (nom tronqué), 4 largeurs dont 375 (#608), auto-contrôle à 1280 rougit table + page ; semis purgé (trackSeed), pas de sleep.
[OK] i18n : aucune chaîne en dur dans le code prod (specs FR en littéraux de données de test) ; TS strict : aucun `any` ; `as HTMLElement` dans `evaluate` E2E acceptable.
## Résolution (lead)
- MAJEUR ProductsListView densité md..lg : corrigé en be209310 (frise pleine dès xl seulement) ; nom visible 183 px à 768, 239 px à 1024 (sonde) ; spec étendue à 768 avec seuil ≥ 120 px ; design approuvé par ui-design, handoff §5 amendé (32aaff7c).
- MINEUR title titre prochain événement : corrigé en be209310 (title sur titre ET nom).
- MINEUR console.log spec : corrigé en be209310 (test.info().attach).
- MINEUR armement plafond titre : corrigé en be209310 (nouveau test d'armement à 1024).
- MINEUR scroller! : corrigé en be209310.
- MINEUR tabs.tsx focus inconditionnel si parent refuse : accepté sans changement — aucun consommateur ne refuse un changement d'onglet ; cas théorique.
- Re-vérification lead sur HEAD final : next build OK, Vitest 2322/2322, format:check OK, E2E complète sur base neuve 653 passés / 1 échec attendu (armement visuel sprint-77 sur darwin) / 8 sautés.
STATUS: COMPLETED
