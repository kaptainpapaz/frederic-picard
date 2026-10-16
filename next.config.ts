import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Regle I9 : image immuable plutot que build sur les artefacts servis.
  // `standalone` produit une image autonome, le conteneur est remplace et non reecrit.
  //
  // ATTENTION, dette connue : sur les-attentionnes, `output: 'standalone'` est la piste
  // jamais testee d'un incident non resolu (onSubmit inoperant en production, onClick
  // fonctionnel). Tant que ce test n'a pas eu lieu, tout formulaire de ce starter passe
  // par un `onClick` explicite plutot que par `onSubmit`. Voir _docs/DETTE.md.
  output: 'standalone',

  images: {
    // Regle B6 : les medias servis hors de Next ne passent pas par l'optimiseur.
    // Voir src/lib/uploads.ts (helper isUploadedImage).
    remotePatterns: [],
  },

  // Téléversement de photos HD par Server Action : 40 Mo par fichier, plusieurs fichiers.
  // Règle G4 : la même limite doit exister côté reverse proxy (client_max_body_size).
  experimental: { serverActions: { bodySizeLimit: '200mb' } },

  // Regle B5 : rien ici ne doit dependre d'une valeur qui change sans rebuild.
  env: {},
}

export default withNextIntl(nextConfig)
