// ============================================================
// Service d'authentification client.
// Aujourd'hui l'authentification est SIMULÉE (MOCK) : aucun
// compte n'est réellement créé ni stocké. Quand l'API sera
// disponible, il suffira d'utiliser la branche réelle (fetch)
// commentée ci-dessous.
// ============================================================

export interface SignUpInput {
  firstName: string;
  phone?: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  mode: 'mock';
}

const MOCK_AUTH_DELAY_MS = 700;

function mockRandomId(): string {
  return crypto.randomUUID();
}

function asyncMockAuth(session: AuthSession): Promise<AuthSession> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(session), MOCK_AUTH_DELAY_MS);
  });
}

// MOCK : crée un compte simulé (rien n'est envoyé ni stocké).
export async function signUp(input: SignUpInput): Promise<AuthSession> {
  return asyncMockAuth({
    user: {
      id: mockRandomId(),
      email: input.email,
      firstName: input.firstName,
    },
    token: mockRandomId(),
    mode: 'mock',
  });
}

// MOCK : simule une connexion (aucune vérification d'identifiants).
export async function signIn(input: SignInInput): Promise<AuthSession> {
  return asyncMockAuth({
    user: {
      id: mockRandomId(),
      email: input.email,
    },
    token: mockRandomId(),
    mode: 'mock',
  });
}