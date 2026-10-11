const wording = {
  de: {
    sign_in: 'Anmelden',
    choose: 'Wie möchtest du dich anmelden?',
    explanation:
      'Mit dieser E-Mail-Adresse kannst du dich als Familie oder als Organisator anmelden.',
    family: 'Als Familie anmelden',
    organiser: 'Als Organisator anmelden',
    choices_label: 'Anmeldung auswählen',
    failed: 'Dein Zugang konnte nicht geladen werden. Bitte versuche es erneut.',
    retry: 'Erneut versuchen',
    loading: 'Dein Zugang wird geladen …',
    sign_out: 'Abmelden',
  },
  en: {
    sign_in: 'Sign in',
    choose: 'How would you like to sign in?',
    explanation: 'With this email address, you can sign in as a family or as an organiser.',
    family: 'Sign in as a family',
    organiser: 'Sign in as an organiser',
    choices_label: 'Choose how to sign in',
    failed: 'Your access could not be loaded. Please try again.',
    retry: 'Try again',
    loading: 'Your access is being checked …',
    sign_out: 'Sign out',
  },
} as const
export function loginCopy(locale = 'de') {
  return locale.split('-')[0] === 'de' ? wording.de : wording.en
}
