# Règles transverses

> **Fichier généré. Ne pas éditer ici.** La source est `_socle/REGLES-TRANSVERSES.md` à la racine du monorepo.
> Pour modifier une règle, éditer la source puis relancer `bash _socle/sync-socle.sh`.
>
> Chaque règle vient d'une panne réelle survenue sur un projet du parc entre février et août 2026. Ce ne sont pas des préférences de style : les ignorer casse quelque chose. L'origine est indiquée entre crochets pour pouvoir retrouver le contexte.
>
> Corpus complet et fiches détaillées : `Flo-Brain / 03 - RESSOURCES / Méthodologies Services / BILAN-Incidents-et-Regles-Durables-2026-08-14.md`

---

## A. Avant d'écrire du code

**A1. Sur Next.js 16 et Prisma 7, ce que tu crois savoir est probablement périmé.**
Ruptures connues à date : `params` est asynchrone et s'attend (`await params`), `middleware.ts` est remplacé par `proxy.ts`, `prisma.config.ts` vit à la racine et non dans `prisma/`, `prisma generate` et `prisma db seed` ne sont plus automatiques et se lancent explicitement, Prisma 7 est ESM only. En cas de doute, lire `node_modules/next/dist/docs/`. [espaceimmobilier, galerie]

**A2. `git status` avant de commencer. Jamais `git add -A`.**
Le monorepo contient une dizaine de projets clients avec leurs propres modifications en cours. L'ajout au commit se fait par chemin explicite limité au projet concerné. Deux sessions ne travaillent pas simultanément sur le même projet ; si c'est inévitable, branches ou worktrees séparés. [ostraveiro, trois collisions en deux jours dont deux plans de développement divergents]

**A3. Le `docker-compose.yml` versionné n'est pas forcément celui de la production.**
Avant tout raisonnement sur l'infrastructure, vérifier lequel fait foi. Un fichier versionné qui ne décrit pas la production est un piège actif, pas de la documentation morte. [ostraveiro, 04/08/2026, un agent s'y est fait prendre]

**A4. Répartir le travail selon le besoin de compilation.**
La conception, le schéma de données, les textes et le thème s'écrivent sans compilateur. Le routage typé, les `Link` typés, `generateStaticParams` et les cascades d'imports exigent une boucle de compilation : ils se font en session éditeur avec `tsc --noEmit` après chaque étape. Écrire du code typé à l'aveugle produit du code qui semble fini et casse à la première compilation. [galerie]

---

## B. Rendu et build

**B1. Le build ne parle à aucun service extérieur.**
`generateStaticParams` n'interroge jamais la base, et aucune page pré-générée ne la lit. Le conteneur de build tourne sans réseau vers PostgreSQL et sans `DATABASE_URL` : le build passe en local et échoue au déploiement. Les pages qui ont besoin de données se rendent à la demande puis restent en cache (ISR). [ostraveiro, règle apprise n°1]

**B2. Ne jamais fournir une base de substitution au build.**
Commiter un `dev.db` pour nourrir le prerender ne résout pas la dépendance, elle la rend invisible : les pages publiques servent alors des données de démo figées, sans aucune erreur. Un échec bruyant vaut mieux qu'un succès faux. [espaceimmobilier]

**B3. Une seule API dynamique fait basculer tout un segment.**
`headers()`, `cookies()` ou `draftMode()` dans n'importe quel fichier de `app/[locale]` fait passer toutes les pages publiques en rendu dynamique, sans la moindre erreur de build. Un `not-found.tsx` a suffi. **Le tableau des routes en fin de build est le seul indicateur de la stratégie de rendu réellement obtenue : il se lit à chaque modification touchant un segment public.** [ostraveiro, règle apprise n°2]

**B4. La locale circule par les props, depuis `params.locale`.**
Jamais par cookie ni par en-tête dans un composant serveur : c'est le cas particulier le plus fréquent de B3. Toute lecture de cookie ou d'en-tête pour déterminer la langue appartient au middleware seul. [ostraveiro]

**B5. `NEXT_PUBLIC_*` est figé au build.**
Deux catégories de variables, jamais interchangeables : celles inlinées dans le bundle au build, et celles lues au démarrage du conteneur. Toute URL interne, tout secret, toute valeur qui diffère entre environnements sans rebuild appartient à la seconde. Une variable publique changée sans rebuild ne change rien, silencieusement. [DefiApp T-096/T-100, florianracine]

**B6. `next/image` ne peut pas optimiser une image servie par un autre serveur.**
Dès qu'un chemin sort du périmètre de Next (uploads servis par Apache ou nginx), tout ce que le framework fait automatiquement sur ce chemin cesse de fonctionner. Passer par un helper `isUploadedImage()` avec `unoptimized`, et redimensionner au téléversement. [ostraveiro]

---

## C. Données

**C1. Toute décision concurrente exige un verrou.**
Tout enchaînement « je lis un état, je décide, j'écris » exécutable par deux acteurs simultanément a besoin d'une garde. Verrou optimiste (`updateMany` avec l'état lu en garde, puis contrôle du `count`) quand on peut réessayer ; verrou de ligne (`SELECT … FOR UPDATE` dans la transaction) quand la décision engage une ressource limitée. Deux familles à repérer systématiquement : les transitions de statut et les capacités limitées. **Le mode de panne est silencieux, il ne se découvre pas en test à un seul utilisateur.** [ostraveiro, règle apprise n°5]

**C2. On compte les personnes, pas les lignes.**
Toute jauge de capacité additionne la quantité portée par chaque enregistrement, jamais `count()`. Et le calcul est identique à l'affichage et dans la décision, sinon l'écran affiche « complet » quand la logique accepte encore. Ce calcul s'écrit une fois dans une fonction unique et ne se réimplémente pas dans la vue. [ostraveiro, règle apprise n°6]

**C3. En production, `migrate deploy` et rien d'autre.**
Jamais de `migrate reset`. Le retour arrière d'une migration est une restauration de sauvegarde plus un retour de code cohérent avec le schéma restauré, ce qui suppose de savoir quel commit correspond à quel schéma. [ostraveiro]

**C4. Un seed déclare sa nature en tête de fichier.**
Soit destructif (réinitialisation de démo, interdit en production), soit idempotent (`upsert` de données de référence, requis à chaque déploiement qui en ajoute). Sans cette déclaration, personne ne sait s'il peut le lancer en production. [espaceimmobilier vs ostraveiro, deux natures opposées]

**C5. Un conteneur qui répond ne prouve pas que la migration a eu lieu.**
Quand les migrations tournent au démarrage, la vérification de déploiement inclut la lecture des journaux dans l'ordre attendu : la ligne de migration doit apparaître avant que le serveur annonce qu'il est prêt. [ostraveiro, espaceimmobilier]

**C6. Toute table de journalisation naît avec sa politique de rétention.**
Branchée sur la même tâche planifiée que la sauvegarde. Sinon la dette est silencieuse jusqu'à ce que le disque ou les temps de requête la révèlent. [ostraveiro, `EmailLog` et `LoginAttempt`]

**C7. Une base ne publie aucun port sur l'hôte, même sur `127.0.0.1`.**
Contrôle positif après chaque intervention : `ss -tlnp | grep 5432` ne doit rien retourner. [ostraveiro]

---

## D. Sauvegardes

**D1. Le périmètre de sauvegarde se révise à chaque ajout de stockage persistant.**
La base n'est pas la seule donnée irremplaçable. Le décalage entre « on ajoute un volume » et « on l'ajoute à la sauvegarde » est le trou classique. [ostraveiro, uploads non sauvegardés depuis le 04/08/2026]

**D2. Une sauvegarde non restaurée n'est pas une sauvegarde.**
La restauration se répète sur une instance jetable, jamais directement sur la production, et le contrôle porte sur une valeur métier attendue, pas sur un compte non nul. [ostraveiro, procédure exécutée pour de vrai le 12/08/2026]

**D3. Contrôle de vraisemblance, et purge conditionnée à la réussite.**
Une archive anormalement petite est traitée comme un échec, pas comme un avertissement : renommée en `.invalide`, journalisée, et aucune ancienne sauvegarde n'est supprimée ce jour-là. Une rotation inconditionnelle transforme une panne de sauvegarde en perte de l'historique. [ostraveiro]

**D4. Tout script d'exploitation vit dans le dépôt.**
Il arrive sur le serveur par le même canal que le code. Un script « à créer à la main sur le serveur » n'est ni testé, ni sauvegardé, ni reproductible, et son absence ne se voit pas. [ostraveiro, avant le 12/08/2026 il n'y avait rien entre deux déploiements]

**D5. Une tâche planifiée qui contient `sudo` va dans la crontab de root.**
Et toute tâche planifiée écrit une trace positive (date, taille, issue) dans un journal qu'on sait où consulter. L'absence de fichier n'est pas une alerte, personne ne la voit. Même famille : une clé SSH à passphrase ne fonctionne pas en CI sans configuration explicite de l'agent. [ostraveiro, les-attentionnes]

---

## E. Auth et permissions

**E1. Derrière un reverse proxy, trois réglages cohérents ou rien.**
L'URL publique déclarée, la confiance à l'hôte transmis, et l'en-tête `X-Forwarded-Proto` relayé par le proxy. Symptômes quand il en manque un : redirections vers `localhost`, cookies de session non posés, boucles de connexion. **Recette obligatoire : se déconnecter, pas seulement se connecter.** Voir E6 pour `X-Forwarded-For`, qui est un autre en-tête, pour un autre usage, et qui a sa propre règle de lecture. [ostraveiro, 11/08/2026]

**E2. L'identité vient du jeton, jamais de l'URL.**
Et la restriction de champs par rôle se fait par des schémas de sortie distincts, jamais par un filtrage manuel dans le code appelant, qui sera oublié à la première route ajoutée. [DefiApp, RG-008 et RG-014]

**E3. Une notion qui existe dans le code, en base et à l'écran se déclare partout.**
La liste complète de ses points de déclaration s'écrit dans le `CLAUDE.md` du projet, sinon chaque ajout ultérieur en oublie un. Les modes de panne sont silencieux et différents selon l'étape oubliée : le bouton n'apparaît pour personne, ou bien la permission protège correctement mais reste inattribuable depuis l'interface. Ajouter les clés de traduction à cette liste. [ostraveiro, règle apprise n°11]

**E4. Une configuration modifiable des deux côtés a une source d'autorité désignée.**
Si le code fait autorité, l'interface prévient que ses modifications sont temporaires. Un outil qui réconcilie en écrasant une source par l'autre ne s'exécute jamais dans une séquence automatique : c'est un geste conscient, à part. [ostraveiro, règle apprise n°12, des droits perdus le 11/08/2026]

**E5. Toute exclusion de middleware se documente avec sa raison.**
Une exclusion non justifiée devient une faille au premier ajout de route. [DefiApp]

**E6. L'IP du client est la dernière valeur de `X-Forwarded-For`, jamais la première.**
Le reverse proxy **ajoute** l'IP réelle en fin de chaîne. Tout ce qui précède vient du client et peut être forgé, y compris en variant à chaque requête. Une limite de débit qui lit `xff.split(',')[0]` compte une valeur choisie par l'attaquant : elle s'applique parfaitement, à une identité imaginaire, et rien ne le signale. Vaut pour toute décision fondée sur l'IP : limite de débit, anti-spam, journal de connexion, liste de blocage. Le rang à lire dépend du nombre de proxys de confiance traversés : il se déclare dans le code, il ne se devine pas. Voir E1, qui traite l'autre en-tête du même proxy. [ostraveiro, 13/08/2026, relevé à l'implémentation du lot P1 bis]

---

## F. Effets de bord externes

**F1. L'envoi d'email n'est jamais dans la même transaction qu'un changement d'état.**
Ordre imposé : on valide, on committe, **puis** on envoie, **puis** on journalise l'issue. Un SMTP indisponible ne doit pas annuler une décision prise par l'équipe. Toute exception survenant après le commit se journalise, elle ne remonte jamais comme un échec de l'action : la remonter ferait croire à l'utilisateur que son action n'a pas eu lieu et l'inciterait à la rejouer. Vaut pour tout appel externe post-commit : webhook, push, paiement. [ostraveiro, règle apprise n°4]

**F2. On n'envoie automatiquement que des textes validés par le client.**
Le registre n'associe une transition à un modèle que si le texte existe. En son absence, l'état change quand même, une note est journalisée, et l'interface prévient que le destinataire ne sera pas averti. **Pas de modèle provisoire dans le code : un texte incomplet finit toujours par partir.** Une checklist de placeholders à remplacer à la main est exactement le mécanisme que cette règle déclare insuffisant. [ostraveiro, règle apprise n°7]

**F3. HTML et texte se produisent d'une même source.**
Sinon ils divergent. Et tout email partant à un client se rend et se montre avant envoi. [ostraveiro]

**F4. Une dépendance externe se conçoit avec son mode dégradé, et le mode dégradé est visible.**
Si une API tierce ne répond pas, servir le cache et afficher l'horodatage de la donnée. L'interface ne bloque jamais. [DefiApp, T-093 et RG-052]

**F5. Un cache d'agrégat se déclare avec la liste exhaustive des mutations qui l'invalident,** dans le même fichier que le calcul. Un TTL court masque le défaut sans le corriger : les données sont fausses juste après l'action de l'utilisateur, c'est-à-dire au pire moment. [DefiApp, T-092]

**F6. Une file de travaux planifiés a besoin d'un indicateur de vitalité.**
Le symptôme d'un ordonnanceur non branché est une file qui grossit sans que rien ne l'exécute, visible seulement si quelqu'un regarde. Vérifier après installation et surveiller la profondeur de file. [ostraveiro]

---

## G. Fichiers et médias

**G1. Les fichiers téléversés ne vivent jamais dans le dépôt.**
Ni dans `public/`, ni ailleurs sous git. Un volume dédié monté à côté du code. Sinon un `git pull` ou un nouveau clone les fait disparaître au déploiement suivant. Séparation stricte entre le code, remplaçable et écrasé à chaque déploiement, et les données produites en production, irremplaçables. [ostraveiro, règle apprise n°8]

**G2. Quand deux processus d'identités différentes partagent un dossier, les permissions font partie de la configuration.**
Le conteneur écrit en root, le serveur web lit en `www-data`. Symptôme caractéristique quand c'est mal réglé : tout fonctionne sauf les médias, ce qui oriente à tort vers l'application. [ostraveiro]

**G3. Les exclusions de proxy se placent avant la règle générale,** et se vérifient par un en-tête de réponse qui prouve quel serveur a répondu. [ostraveiro]

**G4. Régler la limite de taille du corps de requête au moment où l'upload est développé.**
La valeur par défaut du reverse proxy coupe les téléversements avant que l'application les voie. [espaceimmobilier]

---

## H. Interface

**H1. `data-theme` redéfinit des variables, il ne peint rien.**
Tout élément qui ouvre une portée de thème porte **aussi** sa propre classe de fond. Sans elle il reste transparent tout en changeant la couleur de son texte, le pire des deux mondes. Vaut pour `data-theme`, pour `.dark`, et pour tout mécanisme de variables CSS en cascade. [ostraveiro, règle apprise n°3]

**H2. Chaque action asynchrone a un état de chargement visible.**
`isPending`, bouton désactivé pendant l'exécution, indicateur visible. Sans ça l'utilisateur re-clique et crée des doublons. La protection côté serveur (idempotence ou contrainte d'unicité) reste nécessaire, l'interface ne suffit pas. [les-attentionnes]

**H3. Tout texte vu par un utilisateur passe par la couche de traduction.**
Y compris les messages de validation Zod, les libellés d'erreur, les états vides et les textes d'emails. **Le point de fuite habituel est la validation, parce qu'elle vit côté serveur avec le reste de la logique.** [ostraveiro, règle apprise n°9]

**H4. Mobile, non négociable.**
`min-h-[100dvh]` ou `h-dvh`, jamais `h-screen` ni `min-h-screen` : `100vh` ignore la barre d'adresse iOS. Tout `fixed bottom-0` porte `pb-[env(safe-area-inset-bottom)]`. Tout `<main>` sous une navigation basse porte `pb-[64px]` minimum. `font-size >= 16px` sur tous les `<input>`, sinon iOS zoome automatiquement. Un `Dialog` n'a jamais de hauteur fixe : `max-h-[90dvh] overflow-y-auto`. [les-attentionnes, VISUAL-AUDIT]

**H5. Échelle de z-index imposée, de 0 à 70. `z-[9999]` interdit sauf cas exceptionnel documenté.**
shadcn place Dialog, Sheet, Popover et Tooltip en `z-50` par défaut et Sonner en `z-[100]` : si plusieurs sont actifs simultanément, les conflits sont garantis. [les-attentionnes]

**H6. Un décalage de mise en page se diagnostique en traçant la chaîne de conteneurs depuis le layout racine,** pas en corrigeant le symptôme sur la page où il se voit. La double compensation d'une barre fixe (le parent et l'enfant compensent tous les deux) est la cause la plus fréquente. [les-attentionnes]

---

## I. Déploiement

**I1. Identifier quelle commande produit réellement l'artefact.**
`docker compose up -d --build` est un no-op silencieux si le service n'a pas de section `build:` et monte le code en volume. Vérifier à la sortie un signal de redémarrage effectif (`Container … Started`, et non `Running`), jamais l'absence d'erreur. [ostraveiro, 04/08/2026]

**I2. `--force-recreate` systématique.**
`up -d` voit un conteneur en bonne santé et ne fait rien. Un changement qui n'apparaît pas dans la définition du service (contenu d'un volume, variable ajoutée) exige une recréation, pas un redémarrage. Un `restart` ne relit pas une variable. [ostraveiro]

**I3. Une procédure qui alterne deux répertoires de travail se script avec des `cd` explicites.**
Un runbook qui suppose un répertoire courant implicite finit par être joué depuis le mauvais dossier. [ostraveiro, confondu deux fois le 11/08/2026]

**I4. Build et runtime partagent la même libc.**
Dès qu'une dépendance embarque du binaire compilé (`sharp`, `argon2`, `bcrypt`, `better-sqlite3`, drivers natifs), Alpine et Debian ne sont pas interchangeables : les modules compilés à la construction refusent de se charger à l'exécution. Le choix d'Alpine se paie plus tard, pas au moment où on l'écrit. [ostraveiro]

**I5. L'outillage a des dépendances système que l'application n'a pas.**
`prisma migrate deploy` a besoin d'OpenSSL, l'application non. Une image minimale validée par le démarrage de l'app peut échouer au premier déploiement avec migration. Nommer explicitement les paquets ajoutés. [ostraveiro]

**I6. L'outillage disponible au build n'est pas celui du runtime.**
Les commandes de maintenance en production s'écrivent avec ce qui existe dans le conteneur qui tourne, pas avec l'alias utilisé sur le poste de dev. [ostraveiro, `pnpm` absent de l'image de production]

**I7. Un dépôt de production est en lecture seule par construction.**
Clé de déploiement sans droit de push, script de déploiement qui refuse un arbre de travail sale. `git reset --hard` est un pansement, pas une méthode. Le flux est à sens unique : monorepo, dépôt de déploiement, serveur. [ostraveiro vs florianracine]

**I8. Vérifier un déploiement dans le code source, jamais dans la console.**
Ctrl+U et rechargement sans cache. La console montre le DOM après exécution du JavaScript, pas ce que le serveur a envoyé. [ostraveiro]

**I9. Un build qui écrit sur les artefacts en cours de service n'est pas atomique.**
Il a une fenêtre d'indisponibilité partielle. Soit on la planifie hors heures de service, soit on passe à une image immuable avec bascule de conteneur. [ostraveiro, 05/08/2026]

**I10. Avant d'intervenir sur une machine, inventorier ce qu'elle porte d'autre.**
Sur un serveur mutualisé, la recette après intervention vérifie en priorité les services qu'on n'a pas touchés. Si un doute existe entre « est-ce que ça casse le site » et « est-ce que ça casse le mail », c'est la deuxième question qui compte. [ostraveiro]

**I11. Le meilleur retour arrière ne détruit rien et ne dépend d'aucune propagation.**
Quand l'ancien système peut rester en place, le point de bascule se met au niveau du routage, pas du DNS ni du code. Un rechargement de vhost est immédiat, un changement DNS se propage. [ostraveiro]

**I12. Un renouvellement automatique de certificat n'est complet que si le serveur est rechargé.**
Panne différée typique : elle survient jusqu'à 90 jours après l'installation, quand plus personne ne fait le lien. Les montages `nginx-proxy` + `acme-companion` gèrent ce point ; un certbot avec serveur web manuel exige un crochet de rechargement. [ostraveiro]

---

## J. Doctrine de vérification

**J1. L'effort de vérification se calibre sur la réversibilité du défaut, pas sur son importance apparente.**

À la fin d'un lot : `tsc --noEmit`, `build`, et le tableau des routes en fin de build. **Rien d'autre.**

Pas de scénario rejoué, pas de clics automatisés, pas de contrôle en base, pas de capture d'écran, sauf demande explicite.

**Trois zones seulement justifient d'aller plus loin, parce qu'elles sont irrécupérables :**

1. **Le site public.** Si le lot touche un segment public, lire et rapporter le tableau des routes (voir B3).
2. **Les données.** Migration, écriture en masse, suppression : sauvegarde avant, et contrôle que rien n'a disparu.
3. **Les emails partant à un client.** Rendre le message et le montrer avant tout envoi.

Hors de ces trois zones, un défaut se corrige à chaud en cinq minutes. Une vérification préventive coûte une heure, à chaque lot. [ostraveiro]

**J2. Les tests automatisés couvrent les zones irrécupérables, et rien d'autre.**
Transitions d'état avec verrou, calculs de capacité, gardes de permission, rendu des emails. C'est exactement la liste des modes de panne silencieux du corpus, ceux qu'aucun `build` vert ne détectera. Installer un outil de test sans décider ce qu'on teste reproduit le pire des cas : le coût de setup payé, le bénéfice inexistant.

**J3. La vérification porte sur des signaux positifs nommés à l'avance.**
Parce que les pannes les plus coûteuses du corpus ne produisent ni erreur, ni log, ni alerte. Les signaux à connaître : le tableau des routes en fin de build, `Container … Started` et non `Running`, la ligne de migration avant l'annonce « prêt », `ss -tlnp | grep 5432` qui ne retourne rien, la taille de l'archive de sauvegarde, la profondeur de la file de travaux.

**J4. Une différence de comportement dev/prod sans erreur console ni requête réseau se diagnostique par bissection depuis une page minimale qui fonctionne,** pas par élimination d'hypothèses sur la page cassée. [les-attentionnes, cinq hypothèses éliminées à un déploiement chacune avant que la page test minimale n'arrive]

**J5. Tant que la cause n'est pas isolée dans une reproduction minimale, un contournement n'est pas une correction et reste tracé comme dette.**

**J6. Un contrôle qui passe avant comme après le correctif ne prouve rien.**
Tout test écrit pour valider une correction s'éprouve d'abord contre le comportement fautif : il doit échouer sur le code d'avant. S'il passe dans les deux états, il ne discrimine pas, et son vert est une assurance fausse, ce qui est pire qu'une absence de test. Vaut aussi pour les contrôles de checklist : un contrôle qui aurait été satisfait pendant la panne ne surveille rien. Dans un dispositif de vérification volontairement minimal comme celui de J1, chaque contrôle doit gagner sa place. [ostraveiro, 13/08/2026]

---

## K. Documentation

**K1. Un écart entre l'intention initiale et l'implémentation se documente comme un arbitrage ouvert avec son critère de réouverture,** pas comme un oubli. [ostraveiro, le routage i18n préfixé]

**K2. Toute panne qui coûte plus de trente minutes produit une règle datée dans le `CLAUDE.md` du projet,** et remonte dans `_socle/REGLES-TRANSVERSES.md` si elle vaut pour plus d'un projet. C'est le mécanisme qui a produit ce fichier ; sans lui, une règle valable pour neuf projets n'en protège qu'un.
