package com.collab.scheduler.controller;

import com.collab.scheduler.entity.Meeting;
import com.collab.scheduler.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

    private final MeetingRepository meetingRepository;
    private final RedissonClient redissonClient;

    @PostMapping("/book")
    public ResponseEntity<?> bookMeeting(@RequestBody Meeting meeting) {
        // Lock key based on roomId and time slot to prevent double-booking
        String lockKey = "lock:room:" + meeting.getRoomId() + ":" + meeting.getStartTime().toString();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Try to acquire lock for 5 seconds
            if (lock.tryLock(5, 10, TimeUnit.SECONDS)) {
                try {
                    // Check for existing overlapping meetings (Simplified check)
                    boolean exists = meetingRepository.existsByRoomIdAndStartTime(
                            meeting.getRoomId(), meeting.getStartTime());
                    
                    if (exists) {
                        return ResponseEntity.badRequest().body("Room already booked for this slot");
                    }

                    Meeting savedMeeting = meetingRepository.save(meeting);
                    return ResponseEntity.ok(savedMeeting);
                } finally {
                    lock.unlock();
                }
            } else {
                return ResponseEntity.status(409).body("Could not acquire lock, please try again");
            }
        } catch (InterruptedException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/meetings")
    public ResponseEntity<?> getMeetings() {
        return ResponseEntity.ok(meetingRepository.findAll());
    }
}
