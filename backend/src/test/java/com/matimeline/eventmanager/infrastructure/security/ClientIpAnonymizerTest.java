package com.matimeline.eventmanager.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/**
 * #73 RGPD : {@link ClientIpAnonymizer} tronque l'IP avant persistance — jamais
 * l'adresse complète en clair. IPv4 -> dernier octet à zéro ; IPv6 -> 3 premiers
 * hextets ; entrée invalide -> null (on préfère ne rien stocker).
 */
class ClientIpAnonymizerTest {

    @Test
    void ipv4_lastOctetZeroed() {
        assertEquals("192.168.1.0", ClientIpAnonymizer.anonymize("192.168.1.42"));
        assertEquals("10.0.0.0", ClientIpAnonymizer.anonymize("10.0.0.255"));
        assertEquals("127.0.0.0", ClientIpAnonymizer.anonymize("127.0.0.1"));
    }

    @Test
    void ipv4_isTrimmed() {
        assertEquals("8.8.8.0", ClientIpAnonymizer.anonymize("  8.8.8.8  "));
    }

    @Test
    void ipv6_keepsThreeHextets() {
        assertEquals("2001:db8:1::", ClientIpAnonymizer.anonymize("2001:db8:1:2:3:4:5:6"));
    }

    @Test
    void ipv6_loopback_short_returnsNull() {
        // "::1" -> split donne moins de 3 hextets exploitables -> null (non anonymisable proprement).
        assertNull(ClientIpAnonymizer.anonymize("::1"));
    }

    @Test
    void nullOrBlank_returnsNull() {
        assertNull(ClientIpAnonymizer.anonymize(null));
        assertNull(ClientIpAnonymizer.anonymize(""));
        assertNull(ClientIpAnonymizer.anonymize("   "));
    }

    @Test
    void invalidFormat_returnsNull() {
        assertNull(ClientIpAnonymizer.anonymize("not-an-ip"));
        assertNull(ClientIpAnonymizer.anonymize("999.1.1.1"));   // octet > 255
        assertNull(ClientIpAnonymizer.anonymize("1.2.3"));       // 3 parties seulement
    }
}
