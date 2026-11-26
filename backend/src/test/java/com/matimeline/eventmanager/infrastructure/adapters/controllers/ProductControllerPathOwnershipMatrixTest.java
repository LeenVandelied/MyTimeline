package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.EventService;
import com.matimeline.eventmanager.domain.ports.services.ProductService;
import com.matimeline.eventmanager.infrastructure.security.CallerResolver;

/**
 * Matrice des 9 routes /api/users/{userId}/products... : sans appelant -> 401, appelant différent
 * du {userId} du path -> 403, et dans les deux cas ni productService ni eventService ne sont
 * touchés. Même montage standalone que {@link ProductControllerOwnershipTest}.
 */
@ExtendWith(MockitoExtension.class)
class ProductControllerPathOwnershipMatrixTest {

    private enum Route {
        CREATE(HttpMethod.POST, "/products"),
        LIST(HttpMethod.GET, "/products"),
        ARCHIVED(HttpMethod.GET, "/products/archived"),
        ARCHIVED_DETAIL(HttpMethod.GET, "/products/archived/{productId}"),
        RESTORE(HttpMethod.POST, "/products/{productId}/restore"),
        GET_BY_ID(HttpMethod.GET, "/products/{productId}"),
        PATCH(HttpMethod.PATCH, "/products/{productId}"),
        DELETE(HttpMethod.DELETE, "/products/{productId}"),
        EVENTS(HttpMethod.GET, "/products/{productId}/events");

        private final HttpMethod method;
        private final String suffix;

        Route(HttpMethod method, String suffix) {
            this.method = method;
            this.suffix = suffix;
        }

        MockHttpServletRequestBuilder request(UUID userId, UUID productId) {
            String uri = ("/api/users/" + userId + suffix).replace("{productId}", productId.toString());
            MockHttpServletRequestBuilder builder = MockMvcRequestBuilders.request(method, uri);
            if (this == CREATE) {
                builder.contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"p\",\"category\":\"" + UUID.randomUUID()
                                + "\",\"userId\":\"" + userId + "\"}");
            } else if (this == PATCH) {
                builder.contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"p\"}");
            }
            return builder;
        }
    }

    @Mock
    private ProductService productService;
    @Mock
    private EventService eventService;
    @Mock
    private CallerResolver callerResolver;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ProductController controller = new ProductController(productService, eventService, callerResolver);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @ParameterizedTest
    @EnumSource(Route.class)
    void pathRoute_noCaller_returns401_andNoServiceCall(Route route) throws Exception {
        when(callerResolver.currentUser()).thenReturn(Optional.empty());

        mockMvc.perform(route.request(UUID.randomUUID(), UUID.randomUUID()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(productService, eventService);
    }

    @ParameterizedTest
    @EnumSource(Route.class)
    void pathRoute_callerDiffersFromPathUserId_returns403_andNoServiceCall(Route route) throws Exception {
        User caller = new User(UUID.randomUUID(), "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
        when(callerResolver.currentUser()).thenReturn(Optional.of(caller));

        mockMvc.perform(route.request(UUID.randomUUID(), UUID.randomUUID()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(productService, eventService);
    }
}
