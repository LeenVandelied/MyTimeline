package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.matimeline.eventmanager.domain.exceptions.AccountDeletionMismatchException;
import com.matimeline.eventmanager.domain.exceptions.AvatarNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNameConflictException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.CategoryReassignTargetInvalidException;
import com.matimeline.eventmanager.application.dtos.EventResponse;
import com.matimeline.eventmanager.domain.exceptions.EndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.EventConflictException;
import com.matimeline.eventmanager.domain.exceptions.EventNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.ExportFormatNotSupportedException;
import com.matimeline.eventmanager.domain.exceptions.InvalidAvatarException;
import com.matimeline.eventmanager.domain.exceptions.InvalidCredentialsException;
import com.matimeline.eventmanager.domain.exceptions.InvalidDurationUnitException;
import com.matimeline.eventmanager.domain.exceptions.InvalidEventTypeException;
import com.matimeline.eventmanager.domain.exceptions.InvalidPasswordResetTokenException;
import com.matimeline.eventmanager.domain.exceptions.ProductNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceEndDateBeforeStartException;
import com.matimeline.eventmanager.domain.exceptions.RecurrenceUnitRequiredException;
import com.matimeline.eventmanager.domain.exceptions.SamePasswordException;
import com.matimeline.eventmanager.domain.exceptions.SessionNotFoundException;
import com.matimeline.eventmanager.domain.exceptions.UserNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({
            EventNotFoundException.class,
            ProductNotFoundException.class,
            CategoryNotFoundException.class,
            UserNotFoundException.class,
            SessionNotFoundException.class,
            AvatarNotFoundException.class
    })
    public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(buildBody(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Resource not found"));
    }

    @ExceptionHandler(CategoryNameConflictException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryNameConflict(CategoryNameConflictException ex) {
        // BR-CAT-004 (#52) : nom de catégorie déjà pris par CET utilisateur -> 409.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier.
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", "category name already used"));
    }

    @ExceptionHandler(CategoryInUseException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryInUse(CategoryInUseException ex) {
        // AP-CAT-05 (#52) : suppression d'une catégorie référencée sans réassignation
        // -> 409. Le message métier explicite (nombre de produits + marche à suivre)
        // est renvoyé tel quel pour guider le client (critère d'acceptation).
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ExportFormatNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleExportFormatNotSupported(ExportFormatNotSupportedException ex) {
        // #58 : format d'export inconnu, ou format demandé sur le mauvais verbe HTTP
        // (sync en POST / async en GET) -> 400. Corps plat {"error":...}.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "unsupported export format"));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        // #70 : ancien mot de passe faux (POST /api/me/change-password) -> 400.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier des
        // contrôleurs (login/register), distinct du corps détaillé buildBody.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "invalid current password"));
    }

    @ExceptionHandler(InvalidAvatarException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidAvatar(InvalidAvatarException ex) {
        // #75 : upload avatar invalide (fichier absent/vide, type non autorisé détecté par
        // magic bytes, ou taille > 5 Mo) -> 400. Message métier explicite (guide le client,
        // critère d'acceptation) mais SANS fuite d'interne (chemin de stockage, stack).
        // Corps plat {"error":...} cohérent avec les autres erreurs métier 400.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(SamePasswordException.class)
    public ResponseEntity<Map<String, Object>> handleSamePassword(SamePasswordException ex) {
        // Review PR #132 : nouveau mot de passe identique à l'ancien -> 400.
        // Même corps plat {"error":...} que InvalidCredentialsException.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "new password must differ"));
    }

    @ExceptionHandler(AccountDeletionMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleAccountDeletionMismatch(AccountDeletionMismatchException ex) {
        // #78 (BR-AUT-001 variante) : username de confirmation != caller (dérivé du JWT)
        // -> 400. Message neutre {"error":...} (anti-énumération : ne révèle pas si un
        // autre compte porte ce username), cohérent avec les autres erreurs métier 400.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "username confirmation does not match"));
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPasswordResetToken(InvalidPasswordResetTokenException ex) {
        // #49 : token de réinitialisation inexistant / mal formé / expiré (>15 min) /
        // déjà consommé -> 400. Corps plat {"error":...} générique (anti-énumération :
        // ne distingue pas les causes), cohérent avec les autres erreurs métier.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "invalid or expired token"));
    }

    @ExceptionHandler(CategoryReassignTargetInvalidException.class)
    public ResponseEntity<Map<String, Object>> handleCategoryReassignTargetInvalid(
            CategoryReassignTargetInvalidException ex) {
        // FIX review #153 : DELETE avec reassignToCategoryId == id (cible == source) -> 409
        // avec un message DÉDIÉ (au lieu de réutiliser CategoryInUseException, dont le
        // message « fournissez reassignToCategoryId » était trompeur pour ce cas).
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }

    // FIX review #153 : SUPPRESSION du @ExceptionHandler(DataIntegrityViolationException)
    // global. Il mappait TOUTE violation de contrainte en 409 « nom déjà utilisé »,
    // masquant des violations non liées (FK RESTRICT owner_id, autres contraintes) sous
    // un message trompeur. La protection anti-race d'unicité est désormais SCOPÉE au save
    // dans CategoryServiceImpl (try/catch -> CategoryNameConflictException). Les autres
    // violations remontent normalement (500 générique) sans être masquées.

    @ExceptionHandler(InvalidEventTypeException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidEventType(InvalidEventTypeException ex) {
        // BR-EVE-002 : type hors {duration, single}. Symétrique de InvalidDurationUnit -> 422
        // Unprocessable Entity (corps bien formé mais valeur métier invalide). Sans ce handler,
        // la violation ck_events_type remontait en DataIntegrityViolationException non gérée,
        // masquée en 401 par le dispatch /error.
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildBody(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(InvalidDurationUnitException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidDurationUnit(InvalidDurationUnitException ex) {
        // BR-EVE-004 (#54) : durationUnit null/inconnu pour type='duration' -> 422
        // Unprocessable Entity. La requête est bien formée (400 = Bean Validation en amont)
        // mais le calcul d'endDate est impossible. Enveloppe l'ancienne NPE(500)/
        // IllegalArgumentException brute de Utils.calculateEndDate. Corps détaillé buildBody
        // (même forme que les 400/404) — message métier explicite pour guider le client.
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildBody(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(RecurrenceUnitRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleRecurrenceUnitRequired(RecurrenceUnitRequiredException ex) {
        // BR-EVE-006 (#95fix) : PATCH /api/events/{id} amenant l'état fusionné à
        // isRecurring=true / recurrenceUnit=null -> 400. Le chemin CREATE l'impose déjà via
        // @AssertTrue (400) ; ici la garde est côté service (état fusionné, pas payload) car
        // un PATCH partiel peut légitimement s'appuyer sur un recurrenceUnit déjà en base.
        // Corps plat {"error":...} cohérent avec les autres erreurs métier 400.
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "recurrenceUnit is required when isRecurring is true"));
    }

    @ExceptionHandler(RecurrenceEndDateBeforeStartException.class)
    public ResponseEntity<Map<String, Object>> handleRecurrenceEndDateBeforeStart(
            RecurrenceEndDateBeforeStartException ex) {
        // BR-EVE-012 (#168) : PATCH amenant l'état fusionné à recurrenceEndDate < startDate
        // -> 422 Unprocessable Entity. Requête bien formée (400 = Bean Validation en amont)
        // mais sémantiquement incohérente. Même statut que InvalidDurationUnitException
        // (erreur métier events, cf. DEC-S12-001) plutôt que 400. Corps détaillé buildBody.
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildBody(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(EventConflictException.class)
    public ResponseEntity<Map<String, Object>> handleEventConflict(EventConflictException ex) {
        // BR-EVE-015 (#231) : édition concurrente d'un EVENT (@Version) -> 409 ENRICHI.
        // Levée par EventController.updateEvent APRÈS le check d'ownership : l'entité
        // serveur transportée appartient donc au caller légitime (pas de fuite d'autrui).
        // Corps = message neutre (rétro-compat #77) + serverVersion + serverEvent projeté
        // en EventResponse (STRICTEMENT les champs du GET/PATCH propriétaire, aucun champ
        // interne). Consommé par la modale comparative frontend (#231, câblage E2E #232).
        // Distinct du handler générique ci-dessous (Product/Category/User @Version -> 409
        // PLAT inchangé) : on n'enrichit QUE le contrat event, le reste reste chirurgical.
        // HashMap (pas Map.of) : serverVersion peut être null (défense en profondeur).
        Map<String, Object> body = new HashMap<>();
        body.put("error", "resource was modified concurrently, please retry");
        body.put("serverVersion", ex.getServerVersion());
        body.put("serverEvent", EventResponse.fromDomain(ex.getServerEvent()));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        // #200 (BR-EVE-015) : édition concurrente d'une entité versionnée (@Version) —
        // deux updates s'appuyant sur la même version : le 2e flush détecte le décalage et
        // Hibernate lève ObjectOptimisticLockingFailureException -> HTTP 409 Conflict (au
        // lieu du 500 générique non mappé). SCOPÉ au type PRÉCIS de Spring
        // (org.springframework.orm), PAS à un supertype fourre-tout : contrairement à un
        // @ExceptionHandler(DataIntegrityViolationException) global (retiré #153, PIT-S10-002),
        // ce type ne recouvre QUE le conflit de version optimiste — il ne masque aucune autre
        // violation. S'applique donc uniformément à toute entité @Version (Event, Product,
        // Category, User) sans requalifier d'erreurs non liées.
        // Contrat consommé par #77 (Vague 2) : statut 409, corps plat {"error":"..."} —
        // message générique neutre (pas de fuite de version/entité interne).
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", "resource was modified concurrently, please retry"));
    }

    @ExceptionHandler(EndDateBeforeStartException.class)
    public ResponseEntity<Map<String, Object>> handleEndDateBeforeStart(
            EndDateBeforeStartException ex) {
        // BR-EVE-002 (#201) : PATCH amenant l'état fusionné à endDate < startDate -> 422
        // Unprocessable Entity. Requête bien formée (400 = Bean Validation en amont, cf.
        // @AssertTrue DTO qui garde la paire dans le payload) mais sémantiquement incohérente
        // sur l'état fusionné (cas endDate-seule < startDate persistée). Même statut que
        // RecurrenceEndDateBeforeStartException / InvalidDurationUnitException (cohérence
        // DEC-S12-001). Corps détaillé buildBody.
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(buildBody(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        // #75 : la limite servlet multipart (spring.servlet.multipart.max-file-size=5MB)
        // déclenche AVANT le contrôleur (parsing). On la mappe au MÊME 400 + message que la
        // limite applicative (defense in depth : les deux gardent le rejet cohérent).
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "fichier trop volumineux (max 5 Mo)"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(buildBody(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "Validation failed"));
    }

    // NOTE (#119) : aucun @ExceptionHandler(AccessDeniedException) ici. Les accès
    // refusés (403) — règle hasAuthority OU AccessDeniedException métier levée dans
    // un contrôleur (ownership) — remontent jusqu'au ExceptionTranslationFilter de
    // Spring Security, qui les route vers SecurityConfig.accessDeniedHandler.
    // Ce dernier est l'UNIQUE point de vérité du corps 403 {"error":"forbidden"}.
    // Un handler ici créait un chemin jamais exécuté en prod : le @RestControllerAdvice
    // n'est pas atteint pour les 403 interceptés par la chaîne de filtres Security.

    // NOTE (review PR #121) : aucun @ExceptionHandler(AuthenticationException) ici.
    // Même raisonnement que le 403 (#119) : les 401 d'authentification levés dans la
    // chaîne de filtres Spring Security sont interceptés par ExceptionTranslationFilter
    // et routés vers SecurityConfig.authenticationEntryPoint, UNIQUE point de vérité du
    // corps 401 {"error":"unauthorized"}. AuthController gère lui-même ses exceptions
    // d'auth (BadCredentials, JWT expiré/invalide) et renvoie directement. Un handler ici
    // produisait un corps de forme différente ({timestamp,status,error,message}) sur un
    // chemin jamais atteint en prod — supprimé pour éviter la divergence de contrat 401.

    // #127 : le champ "error" MUST être un code stable snake_case (ErrorCode),
    // JAMAIS status.getReasonPhrase() ("Not Found", "Bad Request"...) — non
    // contractuel, dépend de l'implémentation HTTP, pas fait pour être parsé
    // côté client. Voir ErrorCode pour la liste des codes disponibles.
    private Map<String, Object> buildBody(HttpStatus status, ErrorCode code, String message) {
        return buildBody(status, code.getCode(), message);
    }

    private Map<String, Object> buildBody(HttpStatus status, String error, String message) {
        return Map.of(
                "timestamp", Instant.now().toString(),
                "status", status.value(),
                "error", error,
                "message", message
        );
    }
}
