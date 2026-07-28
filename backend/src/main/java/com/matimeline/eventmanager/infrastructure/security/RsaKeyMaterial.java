package com.matimeline.eventmanager.infrastructure.security;

import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;

/**
 * Chargement du matériel de signature RSA utilisé par {@link JwtService} (#323, RS256).
 *
 * <p><strong>Une seule variable d'environnement, pas deux.</strong> Seule la clé PRIVÉE est
 * configurée côté backend ({@code JWT_PRIVATE_KEY}) ; la clé publique en est DÉRIVÉE
 * ({@link RSAPrivateCrtKey} porte modulus + exposant public). Configurer les deux ouvrirait
 * une classe de panne entière — une paire dépareillée signerait des jetons que l'application
 * refuserait elle-même de relire, sans aucun message clair.
 *
 * <p>Format attendu : clé privée <strong>PKCS#8</strong> encodée en Base64 (le corps d'un
 * PEM {@code -----BEGIN PRIVATE KEY-----}). L'armure PEM et les retours à la ligne sont
 * tolérés — un opérateur qui colle un fichier {@code .pem} entier obtient le résultat
 * attendu plutôt qu'une erreur de décodage.
 *
 * <p>⚠ Aucune méthode de cette classe ne fait apparaître la valeur de la clé dans un message
 * d'erreur ou un log : les exceptions levées ne portent que du texte statique (cf.
 * {@link JwtService}).
 */
final class RsaKeyMaterial {

    /**
     * Taille minimale du modulus. RFC 7518 §3.3 impose 2048 bits pour RS256 ; jjwt refuse
     * de son côté toute clé plus courte à la signature — on échoue ici, au boot, avec un
     * message exploitable plutôt qu'à la première tentative de login.
     */
    static final int MIN_MODULUS_BITS = 2048;

    /** Taille des paires ÉPHÉMÈRES générées en dev/test (cf. {@link #generateEphemeral()}). */
    static final int EPHEMERAL_KEY_BITS = 2048;

    private static final String PEM_ARMOR = "-----(BEGIN|END)[^-]*-----";

    private RsaKeyMaterial() {
    }

    /**
     * Parse une clé privée RSA PKCS#8 (Base64, armure PEM tolérée) et en dérive la clé
     * publique correspondante.
     *
     * @throws GeneralSecurityException matériel non décodable, non RSA, non CRT (clé publique
     *                                  non dérivable) ou modulus trop court
     */
    static KeyPair fromPkcs8(String material) throws GeneralSecurityException {
        byte[] der = decode(material);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        PrivateKey privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(der));

        if (!(privateKey instanceof RSAPrivateCrtKey crt)) {
            // Une clé RSA « non CRT » (rarissime, produite par certains HSM logiciels) ne
            // porte pas l'exposant public : impossible d'en dériver la clé de vérification.
            throw new GeneralSecurityException(
                    "clé RSA sans paramètres CRT : exposant public absent, clé publique non dérivable");
        }
        assertLongEnough(crt);

        PublicKey publicKey = factory.generatePublic(
                new RSAPublicKeySpec(crt.getModulus(), crt.getPublicExponent()));
        return new KeyPair(publicKey, privateKey);
    }

    /**
     * Génère une paire RSA jetable, vivante le temps du processus. Utilisée UNIQUEMENT
     * lorsqu'aucune clé n'est configurée (dev local, suites de tests) : les jetons émis ne
     * survivent alors pas à un redémarrage. Le profil {@code prod} impose une clé explicite
     * (cf. {@code ProfileSafetyGuard}).
     */
    static KeyPair generateEphemeral() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(EPHEMERAL_KEY_BITS);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            // RSA est un algorithme obligatoire de toute JRE : inatteignable en pratique.
            throw new IllegalStateException("Génération de paire RSA éphémère impossible", e);
        }
    }

    /**
     * Encode une clé PUBLIQUE au format X.509 SubjectPublicKeyInfo, en Base64 standard —
     * exactement ce qu'attend {@code crypto.subtle.importKey('spki', …)} côté Edge et ce que
     * produit {@code openssl rsa -pubout -outform DER}. Une clé publique n'est pas un secret :
     * cette valeur est destinée à être publiée dans l'environnement du frontend.
     */
    static String toSpkiBase64(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    private static void assertLongEnough(RSAPrivateKey key) throws GeneralSecurityException {
        int bits = key.getModulus().bitLength();
        if (bits < MIN_MODULUS_BITS) {
            throw new GeneralSecurityException(
                    "modulus RSA de " + bits + " bits — RS256 en exige au moins " + MIN_MODULUS_BITS);
        }
    }

    /** Retire l'armure PEM et tout blanc, puis décode le Base64 restant. */
    private static byte[] decode(String material) {
        String body = material.replaceAll(PEM_ARMOR, "").replaceAll("\\s", "");
        return Base64.getDecoder().decode(body);
    }
}
