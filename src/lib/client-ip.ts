/**
 * IP réelle du client, derrière reverse proxy.
 *
 * Règle E6 : le proxy AJOUTE l'IP réelle en fin de `X-Forwarded-For`. Tout ce qui
 * précède vient du client et peut être forgé, en variant à chaque requête. Lire
 * `split(',')[0]` revient à faire confiance à une valeur choisie par l'attaquant :
 * une limite de débit fondée dessus s'applique parfaitement, à une identité
 * imaginaire, et rien ne le signale.
 *
 * Même famille que la règle E2 : une identité ne se lit jamais dans une source que
 * le client contrôle.
 *
 * Origine : ostraveiro, 13/08/2026, limite de débit par IP sur les routes publiques.
 */

/**
 * Nombre de proxys de confiance en façade. Se déclare, ne se devine pas.
 *
 * 1 pour un montage nginx-proxy ou Apache direct devant l'application.
 * 2 s'il y a un CDN ou un second proxy devant le premier.
 * Une valeur trop grande fait lire une valeur forgée : c'est exactement la panne
 * que ce module empêche.
 */
const TRUSTED_PROXY_HOPS = 1

export function clientIp(headers: Headers): string | null {
  const chain = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (chain.length === 0) return null

  const index = chain.length - TRUSTED_PROXY_HOPS
  return index >= 0 ? chain[index] : null
}
