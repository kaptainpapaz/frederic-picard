/**
 * Medias servis hors du perimetre de Next.
 *
 * Regle B6 : `next/image` ne peut pas optimiser une image servie par un autre serveur.
 * L'optimiseur va la chercher aupres de Next, qui ne la connait pas, et l'image casse
 * partout : apercu de l'administration comme pages publiques.
 *
 * Corollaire general, plus important que le cas particulier : quand un chemin sort du
 * perimetre de l'application, tout ce que le framework fait « automatiquement » sur ce
 * chemin cesse de fonctionner.
 *
 * Origine : ostraveiro. Le redimensionnement se fait au televersement (1600 px WebP),
 * donc `unoptimized` ne coute rien.
 */

/** Prefixe des chemins servis par le serveur web, hors de Next. */
export const UPLOADS_PREFIX = '/uploads/'

export function isUploadedImage(src: string): boolean {
  return src.startsWith(UPLOADS_PREFIX)
}

/**
 * Props a etaler sur <Image />. Toute nouvelle image servie par le serveur web
 * DOIT passer par ici.
 *
 *   <Image src={src} alt={alt} width={800} height={600} {...imageProps(src)} />
 */
export function imageProps(src: string): { unoptimized?: true } {
  return isUploadedImage(src) ? { unoptimized: true } : {}
}
