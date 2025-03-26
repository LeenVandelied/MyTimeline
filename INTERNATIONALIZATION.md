# Guide d'Internationalisation (i18n) avec Crowdin

Ce document explique comment gérer les traductions dans notre projet à l'aide de [Crowdin](https://crowdin.com/).

## 1. Architecture de l'internationalisation

Notre application utilise :
- **Frontend** : [react-i18next](https://react.i18next.com/) pour la gestion des traductions côté React
- **Backend** : [Spring MessageSource](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#context-functionality-messagesource) pour les messages côté Java
- **Crowdin** : Pour externaliser et gérer les traductions de manière collaborative

## 2. Structure des fichiers

### Frontend
```
frontend/
├── public/
│   └── locales/
│       ├── fr/
│       │   └── common.json
│       └── en/
│           └── common.json
└── src/
    ├── i18n.ts
    └── components/
        └── ui/
            └── language-selector.tsx
```

### Backend
```
backend/
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── example/
        │           └── eventmanager/
        │               ├── config/
        │               │   └── MessageConfig.java
        │               └── util/
        │                   └── MessageUtil.java
        └── resources/
            ├── messages_fr.properties
            └── messages_en.properties
```

## 3. Utilisation des traductions

### Frontend (React)

#### Simple traduction
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <p>{t('welcome')}</p>;
}
```

#### Traduction avec des variables
```typescript
// {user} est une variable qui sera remplacée
const title = t('greeting', { user: username });
```

#### Changement de langue
```typescript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  return (
    <select onChange={(e) => i18n.changeLanguage(e.target.value)}>
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  );
}
```

### Backend (Java)

#### Dans un contrôleur ou un service
```java
@Autowired
private MessageUtil messageUtil;

// Message simple
String message = messageUtil.getMessage("welcome");

// Message avec des arguments
String message = messageUtil.getMessage("validation.min_length", new Object[] { 8 });

// Message avec locale spécifique
String message = messageUtil.getMessage("welcome", Locale.ENGLISH);
```

## 4. Workflow avec Crowdin

### Installation de l'outil CLI Crowdin
```bash
npm install -g @crowdin/cli
```

### Configuration
Nous utilisons le fichier `crowdin.yml` à la racine du projet pour configurer l'intégration avec Crowdin.

### Commandes principales

#### Extraction des chaînes à traduire
```bash
node scripts/extract-translations.js
```

#### Envoi des sources à Crowdin
```bash
crowdin upload sources
```

#### Téléchargement des traductions
```bash
crowdin download
```

## 5. Bonnes pratiques

1. **Utiliser des clés hiérarchiques** : `user.profile.name` plutôt que `userProfileName`
2. **Ne pas hardcoder les chaînes** : Toujours utiliser les fonctions de traduction
3. **Contexte** : Ajouter des commentaires pour les traducteurs quand nécessaire
4. **Complétion** : Vérifier régulièrement les traductions manquantes
5. **Variables** : Préférer les placeholders nommés aux positions numérotées

## 6. Ajout d'une nouvelle langue

1. Ajouter la langue dans Crowdin
2. Créer les fichiers de ressources correspondants:
   - Frontend: `frontend/public/locales/{code}/common.json`
   - Backend: `backend/src/main/resources/messages_{code}.properties`
3. Ajouter la langue dans le composant `LanguageSelector`
4. Télécharger les traductions depuis Crowdin

## 7. Ressources

- [Documentation Crowdin](https://support.crowdin.com/)
- [Documentation React-i18next](https://react.i18next.com/)
- [Documentation Spring i18n](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#context-functionality-messagesource)

## 8. Contacts

Pour toute question concernant les traductions, contacter l'équipe de localisation. 