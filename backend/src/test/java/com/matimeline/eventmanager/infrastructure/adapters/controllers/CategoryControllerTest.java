package com.matimeline.eventmanager.infrastructure.adapters.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.matimeline.eventmanager.domain.exceptions.CategoryInUseException;
import com.matimeline.eventmanager.domain.exceptions.CategoryNameConflictException;
import com.matimeline.eventmanager.domain.models.Category;
import com.matimeline.eventmanager.domain.models.User;
import com.matimeline.eventmanager.domain.ports.services.CategoryService;
import com.matimeline.eventmanager.domain.ports.services.UserService;
import com.matimeline.eventmanager.infrastructure.security.JwtService;

/**
 * Issue #52 — CRUD catégorie + ownership (ADR-002).
 * Montage standalone MockMvc + GlobalExceptionHandler (comme les autres tests de
 * contrôleur du repo), pour que @Valid -> 400 et les exceptions métier -> 409.
 *
 * Couvre : POST 400/409 ; PATCH 200/400/404/409/403 ; DELETE 204/409/403 + réassignation.
 */
@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock private CategoryService categoryService;
    @Mock private UserService userService;
    @Mock private JwtService jwtService;

    private MockMvc mockMvc;

    private static final String TOKEN = "caller-token";
    private UUID callerId;
    private User caller;

    @BeforeEach
    void setUp() {
        CategoryController controller = new CategoryController(categoryService, userService, jwtService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        callerId = UUID.randomUUID();
        caller = new User(callerId, "Caller", "caller", "pwd", "ROLE_USER", "c@c.com");
    }

    private void stubCaller() {
        when(jwtService.extractUsername(TOKEN)).thenReturn("caller");
        when(userService.findDomainUserByUsername("caller")).thenReturn(Optional.of(caller));
    }

    private Category owned(UUID id, String name) {
        return new Category(id, name, null, null, callerId);
    }

    // ---------------- POST ----------------

    @Test
    void createCategory_emptyName_returns400() throws Exception {
        // @Valid @NotBlank échoue avant le corps -> pas de stub JWT (sinon UnnecessaryStubbing).
        mockMvc.perform(post("/api/categories")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());

        verify(categoryService, never())
                .createCategory(any(), any(), any(), any());
    }

    @Test
    void createCategory_valid_returns201() throws Exception {
        stubCaller();
        UUID newId = UUID.randomUUID();
        when(categoryService.createCategory(eq("Travail"), isNull(), isNull(), eq(callerId)))
                .thenReturn(owned(newId, "Travail"));

        mockMvc.perform(post("/api/categories")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Travail\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Travail"))
                .andExpect(jsonPath("$.ownerId").value(callerId.toString()));
    }

    @Test
    void createCategory_duplicateNameForUser_returns409() throws Exception {
        stubCaller();
        when(categoryService.createCategory(eq("Travail"), isNull(), isNull(), eq(callerId)))
                .thenThrow(new CategoryNameConflictException("Travail"));

        mockMvc.perform(post("/api/categories")
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Travail\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("category name already used"));
    }

    // ---------------- PATCH ----------------

    @Test
    void patchCategory_ownValid_returns200() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "old")));
        when(categoryService.updateCategory(eq(id), eq("new"), eq("#fff"), isNull()))
                .thenReturn(new Category(id, "new", "#fff", null, callerId));

        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"new\",\"color\":\"#fff\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("new"))
                .andExpect(jsonPath("$.color").value("#fff"));
    }

    @Test
    void patchCategory_emptyName_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());

        verify(categoryService, never()).updateCategory(any(), any(), any(), any());
    }

    @Test
    void patchCategory_notFound_returns404() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"new\"}"))
                .andExpect(status().isNotFound());

        verify(categoryService, never()).updateCategory(any(), any(), any(), any());
    }

    @Test
    void patchCategory_ownedByAnotherUser_returns403() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        Category foreign = new Category(id, "x", null, null, UUID.randomUUID());
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(foreign));

        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"new\"}"))
                .andExpect(status().isForbidden());

        verify(categoryService, never()).updateCategory(any(), any(), any(), any());
    }

    @Test
    void patchCategory_systemCategoryNullOwner_returns403() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        Category system = new Category(id, "Système", null, null, null);
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(system));

        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"new\"}"))
                .andExpect(status().isForbidden());

        verify(categoryService, never()).updateCategory(any(), any(), any(), any());
    }

    @Test
    void patchCategory_duplicateName_returns409() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "old")));
        when(categoryService.updateCategory(eq(id), eq("dup"), isNull(), isNull()))
                .thenThrow(new CategoryNameConflictException("dup"));

        mockMvc.perform(patch("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"dup\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("category name already used"));
    }

    // ---------------- DELETE ----------------

    @Test
    void deleteCategory_ownNoProducts_returns204() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "c")));

        mockMvc.perform(delete("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(id, null);
    }

    @Test
    void deleteCategory_referencedWithoutReassign_returns409_withMessage() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "c")));
        doThrow(new CategoryInUseException(3))
                .when(categoryService).deleteCategory(id, null);

        mockMvc.perform(delete("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error")
                        .value("La catégorie est utilisée par 3 produits. Fournissez reassignToCategoryId."));
    }

    @Test
    void deleteCategory_withReassign_returns204_andReassigns() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "src")));
        when(categoryService.getCategoryById(targetId)).thenReturn(Optional.of(owned(targetId, "dst")));

        mockMvc.perform(delete("/api/categories/" + id + "?reassignToCategoryId=" + targetId)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(id, targetId);
    }

    /**
     * FIX review S10 : DELETE avec reassignToCategoryId == id (cible == source) sur une
     * catégorie référencée -> 409 (CategoryInUseException), catégorie NON supprimée. Le
     * service rejette avant réassignation/suppression ; ici on vérifie le contrat HTTP
     * end-to-end (le service mocké lève l'exception mappée en 409 par le handler).
     */
    @Test
    void deleteCategory_reassignToSelf_referenced_returns409_andDoesNotDelete() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "src")));
        doThrow(new CategoryInUseException(2))
                .when(categoryService).deleteCategory(id, id);

        mockMvc.perform(delete("/api/categories/" + id + "?reassignToCategoryId=" + id)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error")
                        .value("La catégorie est utilisée par 2 produits. Fournissez reassignToCategoryId."));
    }

    @Test
    void deleteCategory_reassignTargetOwnedByAnotherUser_returns403() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(categoryService.getCategoryById(id)).thenReturn(Optional.of(owned(id, "src")));
        when(categoryService.getCategoryById(targetId))
                .thenReturn(Optional.of(new Category(targetId, "dst", null, null, UUID.randomUUID())));

        mockMvc.perform(delete("/api/categories/" + id + "?reassignToCategoryId=" + targetId)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isForbidden());

        verify(categoryService, never()).deleteCategory(any(), any());
    }

    @Test
    void deleteCategory_ownedByAnotherUser_returns403() throws Exception {
        stubCaller();
        UUID id = UUID.randomUUID();
        when(categoryService.getCategoryById(id))
                .thenReturn(Optional.of(new Category(id, "c", null, null, UUID.randomUUID())));

        mockMvc.perform(delete("/api/categories/" + id)
                        .cookie(new Cookie("jwt", TOKEN)))
                .andExpect(status().isForbidden());

        verify(categoryService, never()).deleteCategory(any(), any());
    }
}
