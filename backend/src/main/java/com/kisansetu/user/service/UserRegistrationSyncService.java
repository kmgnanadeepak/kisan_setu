package com.kisansetu.user.service;

import com.kisansetu.security.Role;
import com.kisansetu.user.entity.Profile;
import com.kisansetu.user.entity.UserRole;
import com.kisansetu.user.repository.ProfileRepository;
import com.kisansetu.user.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Synchronizes application records for an authenticated Supabase Auth user.
 * <p>
 * Supabase Auth users and the application's user tables are separate concepts.
 * A user created in Supabase Auth has no application profile or role until
 * this service provisions them. The canonical identity is the Supabase user
 * UUID (JWT {@code sub}), never the email address.
 * <p>
 * Provisioning is idempotent and non-destructive:
 * <ul>
 *   <li>a {@code profiles} row is created only if missing (name taken from
 *       {@code user_metadata.full_name}, else the email prefix);</li>
 *   <li>a {@code user_roles} row is created only when the user has NO roles at
 *       all and {@code user_metadata.role} is one of the four app roles;</li>
 *   <li>existing roles are never overwritten or duplicated.</li>
 * </ul>
 * A user without a role in the metadata stays role-less (unauthorized).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserRegistrationSyncService {

    private final ProfileRepository profileRepository;
    private final UserRoleRepository userRoleRepository;

    @Transactional
    public List<Role> synchronize(UUID userId, String email, String fullName, String metadataRole) {
        Optional<Profile> existing = profileRepository.findByUserId(userId);
        boolean profileCreated = existing.isEmpty();
        existing.orElseGet(() -> {
            Profile created = new Profile();
            created.setUserId(userId);
            created.setFullName(profileName(fullName, email));
            return profileRepository.save(created);
        });

        List<Role> roles = userRoleRepository.findRolesByUserId(userId);
        if (roles.isEmpty() && metadataRole != null) {
            Role role = Role.fromDbValue(metadataRole);
            if (role != null) {
                UserRole userRole = new UserRole();
                userRole.setUserId(userId);
                userRole.setRole(role);
                userRoleRepository.save(userRole);
                roles = List.of(role);
                log.info("Provisioned {} role for Supabase user {} ({})", role, userId, email);
            } else {
                log.warn("Supabase user {} ({}) has metadata role '{}' which is not a valid app "
                        + "role; access stays unauthorized", userId, email, metadataRole);
            }
        }
        log.info("App records for Supabase user {} ({}): profile {}, roles {}", userId, email,
                profileCreated ? "created" : "exists", roles);
        return roles;
    }

    private String profileName(String fullName, String email) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        if (email != null && email.contains("@")) {
            return email.split("@")[0];
        }
        return "User";
    }
}