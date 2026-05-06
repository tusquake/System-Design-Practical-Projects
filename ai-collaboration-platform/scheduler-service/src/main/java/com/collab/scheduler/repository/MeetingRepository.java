package com.collab.scheduler.repository;

import com.collab.scheduler.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
    boolean existsByRoomIdAndStartTime(String roomId, OffsetDateTime startTime);
}
