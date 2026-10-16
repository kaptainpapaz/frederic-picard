/**
 * Regle J2 : les tests automatises couvrent les zones irrecuperables, et rien d'autre.
 *
 * Quatre zones, qui sont exactement la liste des modes de panne SILENCIEUX du corpus,
 * ceux qu'aucun `build` vert ne detectera :
 *
 *   1. les calculs de capacite      (regle C2)
 *   2. les gardes de permission     (regle E2, E3)
 *   3. le rendu des emails          (regles F2, F3)
 *   4. les transitions avec verrou  (regle C1)
 *
 * Tout le reste n'est pas teste : hors de ces zones, un defaut se corrige a chaud en
 * cinq minutes, une verification preventive coute une heure a chaque lot (regle J1).
 */

import { describe, expect, it, vi } from 'vitest'
import { CapacityExceededError, assertFits, computeGauge, shouldWaitlist } from '@/lib/capacity'
import { ConcurrentModificationError, optimisticTransition } from '@/lib/locks'
import { commitThen } from '@/lib/after-commit'
import { renderHtml, renderText, type EmailBlock } from '@/lib/email'
import { PERMISSIONS, can, requirePermission } from '@/lib/rbac'
import { clientIp } from '@/lib/client-ip'

/* ------------------------------------------------------------------ */

describe('C2 — une jauge compte les personnes, pas les lignes', () => {
  const inscriptions = [{ people: 4 }, { people: 2 }, { people: 1 }]

  it('additionne la quantite portee par chaque enregistrement', () => {
    const gauge = computeGauge(inscriptions, (i) => i.people, 10)
    expect(gauge.taken).toBe(7)
    expect(gauge.remaining).toBe(3)
    // Le piege exact : trois lignes, sept places.
    expect(gauge.entries).toBe(3)
    expect(gauge.taken).not.toBe(gauge.entries)
  })

  it('refuse une demande qui depasse le restant', () => {
    const gauge = computeGauge(inscriptions, (i) => i.people, 10)
    expect(() => assertFits(gauge, 4)).toThrow(CapacityExceededError)
    expect(() => assertFits(gauge, 3)).not.toThrow()
  })

  it('bascule en liste d attente selon le MEME calcul que l affichage', () => {
    const gauge = computeGauge(inscriptions, (i) => i.people, 10)
    // C'est la garantie de la regle : l'ecran et la decision ne peuvent pas diverger,
    // puisqu'ils appellent la meme fonction sur la meme jauge.
    expect(shouldWaitlist(gauge, 4)).toBe(true)
    expect(gauge.isFull).toBe(false)
    expect(shouldWaitlist(gauge, 3)).toBe(false)
  })

  it('marque complet quand il ne reste rien', () => {
    const gauge = computeGauge([{ people: 10 }], (i) => i.people, 10)
    expect(gauge.isFull).toBe(true)
    expect(gauge.remaining).toBe(0)
  })
})

/* ------------------------------------------------------------------ */

describe('C1 — une transition concurrente est detectee, pas silencieuse', () => {
  it('leve quand l etat a change entre la lecture et l ecriture', async () => {
    // updateMany renvoie 0 : une autre session a deja fait la transition.
    const apply = vi.fn().mockResolvedValue({ count: 0 })
    await expect(optimisticTransition({ entity: 'Reservation', apply })).rejects.toThrow(
      ConcurrentModificationError,
    )
  })

  it('passe quand la garde tient', async () => {
    const apply = vi.fn().mockResolvedValue({ count: 1 })
    await expect(optimisticTransition({ entity: 'Reservation', apply })).resolves.toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */

describe('F1 — un effet de bord rate n annule jamais la decision', () => {
  it('retourne le resultat commite meme si l email echoue', async () => {
    const result = await commitThen(
      async () => ({ id: 'r1', status: 'CONFIRMED' }),
      () => [
        {
          name: 'email:confirmation',
          run: async () => {
            throw new Error('SMTP indisponible')
          },
        },
      ],
    )
    // La decision tient. C'est tout l'objet de la regle.
    expect(result).toEqual({ id: 'r1', status: 'CONFIRMED' })
  })

  it('declenche les effets APRES le commit, dans l ordre', async () => {
    const order: string[] = []
    await commitThen(
      async () => {
        order.push('commit')
        return null
      },
      () => [
        { name: 'a', run: async () => void order.push('a') },
        { name: 'b', run: async () => void order.push('b') },
      ],
    )
    expect(order).toEqual(['commit', 'a', 'b'])
  })
})

/* ------------------------------------------------------------------ */

describe('F3 — HTML et texte viennent de la meme source', () => {
  const blocks: EmailBlock[] = [
    { type: 'heading', text: 'Reservation confirmee' },
    { type: 'paragraph', text: 'Votre table est reservee pour 4 personnes.' },
    { type: 'button', text: 'Voir la reservation', href: 'https://exemple.fr/r/1' },
  ]

  it('produit les deux formats sans divergence de contenu', () => {
    const html = renderHtml(blocks)
    const text = renderText(blocks)
    for (const block of blocks) {
      if ('text' in block) {
        expect(text).toContain(block.text)
        expect(html).toContain(block.text)
      }
    }
    // Le lien doit exister dans les deux, pas seulement dans le HTML.
    expect(text).toContain('https://exemple.fr/r/1')
    expect(html).toContain('https://exemple.fr/r/1')
  })

  it('echappe le HTML injecte dans le contenu', () => {
    const html = renderHtml([{ type: 'paragraph', text: '<script>alert(1)</script>' }])
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

/* ------------------------------------------------------------------ */

describe('E3 — le catalogue de permissions est le point de declaration unique', () => {
  it('respecte le format domaine.ressource.action', () => {
    for (const p of PERMISSIONS) {
      expect(p.key, `cle mal formee : ${p.key}`).toMatch(/^[a-z]+\.[a-z]+\.[a-z]+$/)
    }
  })

  it('porte un libelle et un domaine pour chaque permission', () => {
    // Sans cela, la permission protege reellement mais reste inattribuable a l ecran.
    // C'est l'etape 3 oubliee sur ostraveiro.
    for (const p of PERMISSIONS) {
      expect(p.labelKey, `libelle manquant : ${p.key}`).toBeTruthy()
      expect(p.domain, `domaine manquant : ${p.key}`).toBeTruthy()
    }
  })

  it('n a aucune cle en double', () => {
    const keys = PERMISSIONS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('E2 — la garde refuse par defaut', () => {
  it('refuse une session absente', () => {
    expect(can(null, 'content.page.read')).toBe(false)
    expect(() => requirePermission(null, 'content.page.read')).toThrow('UNAUTHORIZED')
  })

  it('refuse une permission non accordee', () => {
    const session = { user: { permissions: ['content.page.read'] } }
    expect(can(session, 'content.page.publish')).toBe(false)
    expect(() => requirePermission(session, 'content.page.publish')).toThrow('FORBIDDEN')
  })

  it('accepte une permission accordee', () => {
    const session = { user: { permissions: ['content.page.publish'] } }
    expect(() => requirePermission(session, 'content.page.publish')).not.toThrow()
  })
})

/* ------------------------------------------------------------------ */

describe("E6 — l'IP du client est la dernière valeur, jamais la première", () => {
  const headers = (xff: string | null) =>
    new Headers(xff === null ? {} : { 'x-forwarded-for': xff })

  it('retient la valeur ajoutée par le proxy, pas celle fournie par le client', () => {
    // Chaine reelle derriere nginx-proxy : le client a envoye "1.2.3.4",
    // le proxy a ajoute l'IP reelle "5.6.7.8" a la fin.
    expect(clientIp(headers('1.2.3.4, 5.6.7.8'))).toBe('5.6.7.8')
  })

  it("ne retient jamais une chaîne forgée par l'attaquant", () => {
    // Le scenario exact de la panne : l'attaquant varie la premiere valeur a chaque
    // requete pour n'etre jamais compte deux fois par la limite de debit.
    const forged = ['9.9.9.1', '9.9.9.2', '9.9.9.3'].map((fake) =>
      clientIp(headers(`${fake}, 5.6.7.8`)),
    )
    // Toutes les requetes doivent etre attribuees a la MEME identite reelle.
    expect(new Set(forged).size).toBe(1)
    expect(forged[0]).toBe('5.6.7.8')
  })

  it('gère une chaîne à une seule valeur et une absence d en-tête', () => {
    expect(clientIp(headers('5.6.7.8'))).toBe('5.6.7.8')
    expect(clientIp(headers(null))).toBeNull()
    expect(clientIp(headers('  '))).toBeNull()
  })
})
