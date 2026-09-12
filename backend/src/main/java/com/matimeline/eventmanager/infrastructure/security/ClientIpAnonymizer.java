package com.matimeline.eventmanager.infrastructure.security;

/**
 * Anonymisation RGPD des adresses IP avant persistance (issue #73). L'IP est une
 * donnée personnelle : on ne stocke JAMAIS l'adresse complète en clair.
 *
 * <p>Politique : IPv4 -> dernier octet mis à zéro ({@code 192.168.1.42 -> 192.168.1.0}).
 * IPv6 -> on ne conserve que les 3 premiers hextets, le reste tronqué à {@code ::}
 * ({@code 2001:db8:1:2:3::abcd -> 2001:db8:1::}). Toute valeur non reconnue (null,
 * vide, format inattendu) -> {@code null} (on préfère ne rien stocker à stocker une
 * donnée non anonymisée).
 */
public final class ClientIpAnonymizer {

    private ClientIpAnonymizer() {
    }

    public static String anonymize(String ip) {
        if (ip == null || ip.isBlank()) {
            return null;
        }
        String trimmed = ip.trim();

        // IPv4 : exactement 4 octets décimaux -> zéro le dernier.
        String[] v4 = trimmed.split("\\.");
        if (v4.length == 4 && isDottedQuad(v4)) {
            return v4[0] + "." + v4[1] + "." + v4[2] + ".0";
        }

        // IPv6 : garder les 3 premiers hextets, tronquer le reste. On ne traite QUE la
        // forme NON compressée (pas de "::" ni de hextet vide) — une adresse compressée
        // (ex "::1", "fe80::1") ne se prête pas à une troncature positionnelle fiable,
        // on préfère alors ne rien stocker (null) plutôt qu'une valeur douteuse.
        if (trimmed.contains(":")) {
            if (trimmed.contains("::")) {
                return null;
            }
            String[] hextets = trimmed.split(":");
            if (hextets.length >= 3 && !hextets[0].isEmpty()
                    && !hextets[1].isEmpty() && !hextets[2].isEmpty()) {
                return hextets[0] + ":" + hextets[1] + ":" + hextets[2] + "::";
            }
            return null;
        }

        // Format non reconnu : ne rien stocker plutôt qu'une donnée non anonymisée.
        return null;
    }

    private static boolean isDottedQuad(String[] parts) {
        for (String part : parts) {
            if (part.isEmpty() || part.length() > 3) {
                return false;
            }
            for (int i = 0; i < part.length(); i++) {
                if (!Character.isDigit(part.charAt(i))) {
                    return false;
                }
            }
            int value = Integer.parseInt(part);
            if (value > 255) {
                return false;
            }
        }
        return true;
    }
}
