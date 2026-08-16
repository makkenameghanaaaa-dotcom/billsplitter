package com.billsplitter.controller;

import com.billsplitter.dto.request.SignupRequest;
import com.billsplitter.entity.User;
import com.billsplitter.repository.UserRepository;
import com.billsplitter.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @org.springframework.beans.factory.annotation.Value("${google.client.id}")
    private String googleClientId;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already in use"));
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody com.billsplitter.dto.request.LoginRequest request) {
        return userRepository.findByEmail(request.getEmail())
            .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            .map(user -> {
                String token = jwtUtil.generateToken(user.getEmail(), user.getId());
                return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
            })
            .orElseGet(() -> ResponseEntity.status(401).body(Map.of("error", "Invalid email or password")));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody com.billsplitter.dto.request.GoogleAuthRequest request) {
        try {
            com.google.api.client.json.JsonFactory jsonFactory = new com.google.api.client.json.gson.GsonFactory();
            com.google.api.client.http.HttpTransport transport = new com.google.api.client.http.javanet.NetHttpTransport();
            
            com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier = 
                new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                .setAudience(java.util.Collections.singletonList(googleClientId))
                .build();

            com.google.api.client.googleapis.auth.oauth2.GoogleIdToken idToken = verifier.verify(request.getCredential());
            
            if (idToken != null) {
                com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");

                User user = userRepository.findByEmail(email).orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(name);
                    // Google users do not have a password
                    newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
                    return userRepository.save(newUser);
                });

                String token = jwtUtil.generateToken(user.getEmail(), user.getId());
                return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
            } else {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid Google ID token"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e.getMessage())));
        }
    }
}
