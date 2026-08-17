package com.mnktax.auth.security;

import com.mnktax.auth.entity.Role;
import com.mnktax.auth.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;

public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String username;
    private final String password;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(Long id, String username, String password, boolean enabled,
                             Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.enabled = enabled;
        this.authorities = authorities;
    }

    public static CustomUserDetails from(User user) {
        Collection<GrantedAuthority> authorities = user.getRoles().stream()
                .map(Role::getCode)
                .map(code -> new SimpleGrantedAuthority("ROLE_" + code))
                .collect(Collectors.toSet());
        user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(p -> new SimpleGrantedAuthority("PERMISSION_" + p.getCode()))
                .forEach(authorities::add);
        return new CustomUserDetails(user.getId(), user.getUsername(), user.getPassword(),
                user.isEnabled(), authorities);
    }

    public Long getId() {
        return id;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
