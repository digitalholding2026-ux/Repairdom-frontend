/* Règles de robustesse du mot de passe (miroir du backend
 * `assertPasswordStrong` + `ResetPasswordDto`) : 8+ caractères, 1 majuscule,
 * 1 minuscule, 1 chiffre. Pur et testable, sans dépendance UI. */

export interface PasswordRule {
  id: 'length' | 'uppercase' | 'lowercase' | 'digit';
  label: string;
  satisfied: boolean;
}

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: 'length', label: '8 caractères minimum', satisfied: password.length >= 8 },
    { id: 'uppercase', label: '1 majuscule', satisfied: /[A-Z]/.test(password) },
    { id: 'lowercase', label: '1 minuscule', satisfied: /[a-z]/.test(password) },
    { id: 'digit', label: '1 chiffre', satisfied: /[0-9]/.test(password) },
  ];
}

export type PasswordStrength = 'faible' | 'moyen' | 'fort';

/* Jauge : faible (0-2 règles), moyen (3 règles ou 4 sans longueur bonus),
 * fort (4 règles + 12 caractères ou plus). */
export function passwordStrength(password: string): PasswordStrength {
  const satisfied = passwordRules(password).filter((rule) => rule.satisfied).length;
  if (satisfied <= 2) return 'faible';
  if (satisfied === 3) return 'moyen';
  return password.length >= 12 ? 'fort' : 'moyen';
}

export function isPasswordStrong(password: string): boolean {
  return passwordRules(password).every((rule) => rule.satisfied);
}
