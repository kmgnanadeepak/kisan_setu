package com.kisansetu.security;

import com.kisansetu.user.repository.UserRoleRepository;
import com.kisansetu.user.service.UserRegistrationSyncService;
import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.text.ParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Extracts the Bearer token, validates it with Supabase, loads the user's
 * roles from the database and populates the security context.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final SupabaseJwtDecoder jwtDecoder;
    private final UserRegistrationSyncService userSyncService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                JWTClaimsSet claims = jwtDecoder.verify(token);
                UUID userId = jwtDecoder.extractUserId(claims).orElse(null);
                if (userId == null) {
                    log.warn("Rejecting request {} {}: token has no valid subject UUID",
                            request.getMethod(), request.getRequestURI());
                    SecurityContextHolder.clearContext();
                    chain.doFilter(request, response);
                    return;
                }
                String email = null;
                try {
                    email = claims.getStringClaim("email");
                } catch (java.text.ParseException ignored) {
                }
                String fullName = null;
                String metadataRole = null;
                try {
                    Map<String, Object> metadata = claims.getJSONObjectClaim("user_metadata");
                    if (metadata != null) {
                        Object fn = metadata.get("full_name");
                        if (fn instanceof String s && !s.isBlank()) {
                            fullName = s;
                        }
                        Object r = metadata.get("role");
                        if (r instanceof String s && !s.isBlank()) {
                            metadataRole = s;
                        }
                    }
                } catch (ParseException ignored) {
                }

                List<Role> roles;
                try {
                    roles = userSyncService.synchronize(userId, email, fullName, metadataRole);
                } catch (DataAccessException e) {
                    log.error("Rejecting request {} {}: role lookup failed for user {}: {}",
                            request.getMethod(), request.getRequestURI(), userId, e.getMessage());
                    SecurityContextHolder.clearContext();
                    chain.doFilter(request, response);
                    return;
                }
                log.info("Authenticated user {} ({}) resolved roles: {}", userId, email, roles);
                if (roles.isEmpty()) {
                    log.warn("Authenticated user {} has no roles in the database; "
                            + "requests will be denied by role checks", userId);
                }

                AuthUser principal = AuthUser.of(userId, email, roles);
                var authorities = roles.stream()
                        .map(r -> new SimpleGrantedAuthority(r.authority()))
                        .toList();
                var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtValidationException e) {
                log.warn("Rejecting request {} {}: {}", request.getMethod(), request.getRequestURI(),
                        e.getMessage());
                SecurityContextHolder.clearContext();
            } catch (Exception e) {
                log.warn("Rejecting request {} {}: unexpected authentication error: {}",
                        request.getMethod(), request.getRequestURI(), e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}