package com.billsplitter.controller;

import com.billsplitter.dto.request.GroupRequest;
import com.billsplitter.entity.Group;
import com.billsplitter.entity.User;
import com.billsplitter.repository.GroupRepository;
import com.billsplitter.repository.UserRepository;
import com.billsplitter.security.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Unauthorized");
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.validateToken(token)) {
            throw new RuntimeException("Invalid Token");
        }
        String email = jwtUtil.extractEmail(token);
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping
    public ResponseEntity<?> createGroup(@RequestHeader("Authorization") String authHeader, @Valid @RequestBody GroupRequest request) {
        try {
            User user = getAuthenticatedUser(authHeader);
            Group group = new Group();
            group.setName(request.getName());
            group.setBaseCurrency(request.getBaseCurrency().toUpperCase());
            group.setCreatedBy(user);
            
            Group saved = groupRepository.save(group);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getGroups(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = getAuthenticatedUser(authHeader);
            List<Group> groups = groupRepository.findByCreatedBy_Id(user.getId());
            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGroup(@RequestHeader("Authorization") String authHeader, @PathVariable Long id) {
        try {
            User user = getAuthenticatedUser(authHeader);
            Group group = groupRepository.findById(id).orElseThrow(() -> new RuntimeException("Group not found"));
            
            if (!group.getCreatedBy().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only delete groups you created"));
            }
            
            groupRepository.delete(group);
            return ResponseEntity.ok(Map.of("message", "Group deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }
}
