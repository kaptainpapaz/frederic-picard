import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Ces exports remplacent ceux de next/link et next/navigation.
 * Regle : ne jamais importer Link depuis next/link dans un segment localise, sinon la
 * locale se perd. Les routes sont typees a la compilation (voir regle A4).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
