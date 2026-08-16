package com.billsplitter.repository;

import com.billsplitter.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {
    java.util.List<Group> findByCreatedBy_Id(Long userId);
}
